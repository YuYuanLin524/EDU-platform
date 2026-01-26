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
        """Test bulk import with non-existent class reports error but creates user."""
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
        assert data["created_count"] == 1
        assert len(data["errors"]) == 1
        assert "不存在" in data["errors"][0]
        assert data["users"][0]["class_name"] is None  # Not bound

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
