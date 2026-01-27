"""
Admin integration tests.

Tests:
- Bulk import users
- List users
- Reset password
- RBAC for admin endpoints
"""

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from app.models import User, UserRole, UserStatus, PromptScope, ScopeType, ExportJob, ExportStatus, AuditLog

from tests.conftest import auth_header


class TestBulkImportUsers:
    """Tests for POST /admin/users/bulk-import endpoint."""

    async def test_bulk_import_students(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
        test_class,
    ):
        """Test bulk importing students."""
        response = await client.post(
            "/admin/users/bulk-import",
            json={
                "users": [
                    {
                        "username": "import_student1",
                        "display_name": "Imported Student 1",
                        "role": "student",
                        "class_name": test_class.name,
                    },
                    {
                        "username": "import_student2",
                        "display_name": "Imported Student 2",
                        "role": "student",
                        "class_name": test_class.name,
                    },
                ]
            },
            headers=auth_header(admin_token),
        )

        assert response.status_code == 200
        data = response.json()
        assert data["created_count"] == 2
        assert len(data["users"]) == 2
        assert len(data["errors"]) == 0

        # Check initial passwords are returned
        for user in data["users"]:
            assert "initial_password" in user
            assert len(user["initial_password"]) >= 8
            assert user["class_name"] == test_class.name

    async def test_bulk_import_teachers(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
    ):
        """Test bulk importing teachers without class binding."""
        response = await client.post(
            "/admin/users/bulk-import",
            json={
                "users": [
                    {
                        "username": "import_teacher1",
                        "display_name": "Imported Teacher 1",
                        "role": "teacher",
                    },
                ]
            },
            headers=auth_header(admin_token),
        )

        assert response.status_code == 200
        data = response.json()
        assert data["created_count"] == 1

    async def test_bulk_import_duplicate_username(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
        student_user: User,  # Already exists with username "student1"
        test_class,
    ):
        """Test bulk import with duplicate username reports error."""
        response = await client.post(
            "/admin/users/bulk-import",
            json={
                "users": [
                    {
                        "username": "student1",  # Already exists
                        "display_name": "Duplicate Student",
                        "role": "student",
                        "class_name": test_class.name,
                    },
                ]
            },
            headers=auth_header(admin_token),
        )

        assert response.status_code == 200
        data = response.json()
        assert data["created_count"] == 0
        assert len(data["errors"]) == 1
        assert "已存在" in data["errors"][0]

    async def test_bulk_import_nonexistent_class(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
    ):
        """Test bulk import with non-existent class rejects student creation."""
        response = await client.post(
            "/admin/users/bulk-import",
            json={
                "users": [
                    {
                        "username": "import_orphan",
                        "display_name": "Orphan Student",
                        "role": "student",
                        "class_name": "NonexistentClass",
                    },
                ]
            },
            headers=auth_header(admin_token),
        )

        assert response.status_code == 200
        data = response.json()
        assert data["created_count"] == 0
        assert len(data["errors"]) == 1
        assert "不存在" in data["errors"][0]
        assert len(data["users"]) == 0

    async def test_bulk_import_student_missing_class_rejected(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
    ):
        """Test student without class_name is rejected."""
        response = await client.post(
            "/admin/users/bulk-import",
            json={
                "users": [
                    {
                        "username": "import_student_no_class",
                        "display_name": "No Class Student",
                        "role": "student",
                    },
                ]
            },
            headers=auth_header(admin_token),
        )

        assert response.status_code == 200
        data = response.json()
        assert data["created_count"] == 0
        assert len(data["errors"]) == 1
        assert "必须选择班级" in data["errors"][0]

    async def test_non_admin_cannot_bulk_import(
        self,
        client: AsyncClient,
        teacher_user: User,
        teacher_token: str,
    ):
        """Test that non-admin users cannot bulk import."""
        response = await client.post(
            "/admin/users/bulk-import",
            json={
                "users": [
                    {
                        "username": "should_fail",
                        "display_name": "Should Fail",
                        "role": "student",
                    },
                ]
            },
            headers=auth_header(teacher_token),
        )

        assert response.status_code == 403


class TestListUsers:
    """Tests for GET /admin/users endpoint."""

    async def test_list_all_users(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
        student_user: User,
        teacher_user: User,
        fully_setup_class,
    ):
        """Test listing all users."""
        response = await client.get(
            "/admin/users",
            headers=auth_header(admin_token),
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 3  # admin, student, teacher
        assert len(data["items"]) >= 3

        by_username = {u["username"]: u for u in data["items"]}
        assert "class_names" in by_username["admin"]
        assert by_username["admin"]["class_names"] == []
        assert fully_setup_class.name in by_username["student1"]["class_names"]
        assert fully_setup_class.name in by_username["teacher1"]["class_names"]

    async def test_list_users_filter_by_role(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
        student_user: User,
    ):
        """Test filtering users by role."""
        response = await client.get(
            "/admin/users?role=student",
            headers=auth_header(admin_token),
        )

        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            assert item["role"] == "student"

    async def test_list_users_pagination(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
    ):
        """Test user list pagination."""
        response = await client.get(
            "/admin/users?page=1&page_size=2",
            headers=auth_header(admin_token),
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) <= 2


class TestSetTeacherClasses:
    async def test_set_teacher_classes(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
        teacher_user: User,
        teacher_token: str,
        test_session,
    ):
        from app.models import Class

        c1 = Class(name="24网络安全", grade=None)
        c2 = Class(name="24软件测试", grade=None)
        test_session.add(c1)
        test_session.add(c2)
        await test_session.commit()
        await test_session.refresh(c1)
        await test_session.refresh(c2)

        response = await client.put(
            f"/admin/teachers/{teacher_user.id}/classes",
            json={"class_ids": [c1.id, c2.id]},
            headers=auth_header(admin_token),
        )
        assert response.status_code == 200
        data = response.json()
        assert data["teacher_id"] == teacher_user.id
        assert set(data["class_names"]) == {c1.name, c2.name}

        teacher_classes = await client.get("/classes", headers=auth_header(teacher_token))
        assert teacher_classes.status_code == 200
        class_items = teacher_classes.json()["items"]
        assert set([c["name"] for c in class_items]) == {c1.name, c2.name}


class TestSetStudentClass:
    async def test_set_student_class(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
        student_user: User,
        fully_setup_class,
        test_session,
    ):
        response_create = await client.post(
            "/classes",
            json={"name": "转入班级", "grade": "七年级"},
            headers=auth_header(admin_token),
        )
        assert response_create.status_code == 200
        new_class = response_create.json()

        response = await client.put(
            f"/admin/students/{student_user.id}/class",
            json={"class_id": new_class["id"]},
            headers=auth_header(admin_token),
        )
        assert response.status_code == 200
        data = response.json()
        assert data["student_id"] == student_user.id
        assert data["class_id"] == new_class["id"]
        assert data["class_name"] == new_class["name"]

        list_response = await client.get("/admin/users?role=student", headers=auth_header(admin_token))
        assert list_response.status_code == 200
        items = list_response.json()["items"]
        target = next((u for u in items if u["id"] == student_user.id), None)
        assert target is not None
        assert target["class_names"] == [new_class["name"]]

        from app.models import ClassStudent

        result = await test_session.execute(
            select(ClassStudent).where(ClassStudent.student_id == student_user.id)
        )
        links = result.scalars().all()
        assert len(links) == 1
        assert links[0].class_id == new_class["id"]

    async def test_non_admin_cannot_set_student_class(
        self,
        client: AsyncClient,
        teacher_user: User,
        teacher_token: str,
        student_user: User,
        test_class,
    ):
        response = await client.put(
            f"/admin/students/{student_user.id}/class",
            json={"class_id": test_class.id},
            headers=auth_header(teacher_token),
        )
        assert response.status_code == 403


class TestResetPassword:
    """Tests for POST /admin/users/{user_id}/reset-password endpoint."""

    async def test_reset_password_auto_generate(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
        student_user: User,
    ):
        """Test resetting password with auto-generated password."""
        response = await client.post(
            f"/admin/users/{student_user.id}/reset-password",
            headers=auth_header(admin_token),
        )

        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == student_user.id
        assert data["username"] == student_user.username
        assert "new_password" in data
        assert len(data["new_password"]) >= 8

    async def test_reset_password_with_specified_password(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
        student_user: User,
    ):
        """Test resetting password with specified password."""
        new_password = "SpecifiedPass123"
        response = await client.post(
            f"/admin/users/{student_user.id}/reset-password",
            json={"new_password": new_password},
            headers=auth_header(admin_token),
        )

        assert response.status_code == 200
        data = response.json()
        assert data["new_password"] == new_password

        # Verify can login with new password
        login_response = await client.post(
            "/auth/login",
            json={"username": student_user.username, "password": new_password},
        )
        assert login_response.status_code == 200
        # Must change password flag should be set
        assert login_response.json()["must_change_password"] is True

    async def test_reset_password_nonexistent_user(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
    ):
        """Test resetting password for non-existent user returns 404."""
        response = await client.post(
            "/admin/users/99999/reset-password",
            headers=auth_header(admin_token),
        )

        assert response.status_code == 404


class TestDeleteUser:
    async def test_delete_user_with_related_records(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
        test_session,
    ):
        user = User(
            username="delete_me",
            display_name="Delete Me",
            role=UserRole.STUDENT,
            password_hash="x",
            must_change_password=False,
            status=UserStatus.ACTIVE,
        )
        test_session.add(user)
        await test_session.commit()
        await test_session.refresh(user)
        user_id = user.id

        test_session.add(
            PromptScope(
                scope_type=ScopeType.GLOBAL,
                content="prompt",
                version=1,
                is_active=True,
                created_by=user_id,
            )
        )
        test_session.add(
            ExportJob(
                requested_by=user_id,
                scope={"student_id": user_id},
                status=ExportStatus.PENDING,
            )
        )
        test_session.add(
            AuditLog(
                actor_id=user_id,
                action="login",
                target_type="user",
                target_id=user_id,
                meta={"ip": "127.0.0.1"},
            )
        )
        await test_session.commit()

        response = await client.delete(
            f"/admin/users/{user_id}",
            headers=auth_header(admin_token),
        )
        assert response.status_code == 200

        test_session.expire_all()

        deleted_user = (
            await test_session.execute(select(User).where(User.id == user_id))
        ).scalar_one_or_none()
        assert deleted_user is None

        prompts = (
            await test_session.execute(
                select(PromptScope).where(PromptScope.created_by == user_id)
            )
        ).scalars().all()
        assert prompts == []

        exports = (
            await test_session.execute(
                select(ExportJob).where(ExportJob.requested_by == user_id)
            )
        ).scalars().all()
        assert exports == []

        login_logs = (
            await test_session.execute(select(AuditLog).where(AuditLog.action == "login"))
        ).scalars().all()
        assert len(login_logs) == 1
        assert login_logs[0].actor_id is None
