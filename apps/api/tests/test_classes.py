"""
Classes integration tests.

Tests:
- Create class
- List classes (role-based filtering)
- Get class detail
- Add students/teachers to class
"""

import pytest
from httpx import AsyncClient
from app.models import User, Class

from tests.conftest import auth_header


class TestCreateClass:
    """Tests for POST /classes endpoint."""

    async def test_admin_create_class(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
    ):
        """Test admin can create a class."""
        response = await client.post(
            "/classes",
            json={"name": "八年级一班", "grade": "八年级"},
            headers=auth_header(admin_token),
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "八年级一班"
        assert data["grade"] == "八年级"
        assert data["student_count"] == 0
        assert data["teacher_count"] == 0
        assert "id" in data

    async def test_create_duplicate_class(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
        test_class: Class,
    ):
        """Test creating class with duplicate name returns 400."""
        response = await client.post(
            "/classes",
            json={"name": test_class.name, "grade": "七年级"},
            headers=auth_header(admin_token),
        )

        assert response.status_code == 400
        assert "已存在" in response.json()["detail"]

    async def test_teacher_cannot_create_class(
        self,
        client: AsyncClient,
        teacher_user: User,
        teacher_token: str,
    ):
        """Test teacher cannot create a class."""
        response = await client.post(
            "/classes",
            json={"name": "新班级", "grade": "七年级"},
            headers=auth_header(teacher_token),
        )

        assert response.status_code == 403


class TestListClasses:
    """Tests for GET /classes endpoint."""

    async def test_admin_list_all_classes(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
        test_class: Class,
    ):
        """Test admin can list all classes."""
        response = await client.get(
            "/classes",
            headers=auth_header(admin_token),
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        assert any(c["name"] == test_class.name for c in data["items"])

    async def test_teacher_list_teaching_classes(
        self,
        client: AsyncClient,
        teacher_user: User,
        teacher_token: str,
        class_with_teacher: Class,
    ):
        """Test teacher only sees classes they teach."""
        response = await client.get(
            "/classes",
            headers=auth_header(teacher_token),
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["name"] == class_with_teacher.name

    async def test_student_list_enrolled_classes(
        self,
        client: AsyncClient,
        student_user: User,
        student_token: str,
        class_with_student: Class,
    ):
        """Test student only sees classes they are enrolled in."""
        response = await client.get(
            "/classes",
            headers=auth_header(student_token),
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["name"] == class_with_student.name


class TestGetClassDetail:
    """Tests for GET /classes/{class_id} endpoint."""

    async def test_admin_get_any_class_detail(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
        fully_setup_class: Class,
    ):
        """Test admin can get detail of any class."""
        response = await client.get(
            f"/classes/{fully_setup_class.id}",
            headers=auth_header(admin_token),
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == fully_setup_class.name
        assert len(data["students"]) == 1
        assert len(data["teachers"]) == 1

    async def test_teacher_get_teaching_class_detail(
        self,
        client: AsyncClient,
        teacher_user: User,
        teacher_token: str,
        fully_setup_class: Class,
    ):
        """Test teacher can get detail of class they teach."""
        response = await client.get(
            f"/classes/{fully_setup_class.id}",
            headers=auth_header(teacher_token),
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == fully_setup_class.name

    async def test_teacher_cannot_get_other_class_detail(
        self,
        client: AsyncClient,
        teacher_user: User,
        teacher_token: str,
        test_class: Class,  # Teacher not assigned to this class
    ):
        """Test teacher cannot get detail of class they don't teach."""
        response = await client.get(
            f"/classes/{test_class.id}",
            headers=auth_header(teacher_token),
        )

        assert response.status_code == 403

    async def test_student_get_enrolled_class_detail(
        self,
        client: AsyncClient,
        student_user: User,
        student_token: str,
        fully_setup_class: Class,
    ):
        """Test student can get detail of class they are enrolled in."""
        response = await client.get(
            f"/classes/{fully_setup_class.id}",
            headers=auth_header(student_token),
        )

        assert response.status_code == 200

    async def test_student_cannot_get_other_class_detail(
        self,
        client: AsyncClient,
        student_user: User,
        student_token: str,
        test_class: Class,  # Student not enrolled in this class
    ):
        """Test student cannot get detail of class they aren't enrolled in."""
        response = await client.get(
            f"/classes/{test_class.id}",
            headers=auth_header(student_token),
        )

        assert response.status_code == 403

    async def test_get_nonexistent_class(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
    ):
        """Test getting non-existent class returns 404."""
        response = await client.get(
            "/classes/99999",
            headers=auth_header(admin_token),
        )

        assert response.status_code == 404


class TestAddStudentsToClass:
    """Tests for POST /classes/{class_id}/students/bulk-add endpoint."""

    async def test_add_students_to_class(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
        test_class: Class,
        test_session,
    ):
        """Test adding students to a class."""
        from app.models import User, UserRole, UserStatus
        from app.auth.security import hash_password

        # Create a new student to add
        new_student = User(
            username="new_student_for_class",
            display_name="New Student",
            role=UserRole.STUDENT,
            password_hash=hash_password("test123"),
            must_change_password=False,
            status=UserStatus.ACTIVE,
        )
        test_session.add(new_student)
        await test_session.commit()
        await test_session.refresh(new_student)

        response = await client.post(
            f"/classes/{test_class.id}/students/bulk-add",
            json={"student_ids": [new_student.id]},
            headers=auth_header(admin_token),
        )

        assert response.status_code == 200
        data = response.json()
        assert data["added"] == 1
        assert len(data["errors"]) == 0

    async def test_add_nonexistent_student(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
        test_class: Class,
    ):
        """Test adding non-existent student reports error."""
        response = await client.post(
            f"/classes/{test_class.id}/students/bulk-add",
            json={"student_ids": [99999]},
            headers=auth_header(admin_token),
        )

        assert response.status_code == 200
        data = response.json()
        assert data["added"] == 0
        assert len(data["errors"]) == 1
        assert "不存在" in data["errors"][0]

    async def test_add_teacher_as_student_fails(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
        test_class: Class,
        teacher_user: User,
    ):
        """Test adding teacher to student list reports error."""
        response = await client.post(
            f"/classes/{test_class.id}/students/bulk-add",
            json={"student_ids": [teacher_user.id]},
            headers=auth_header(admin_token),
        )

        assert response.status_code == 200
        data = response.json()
        assert data["added"] == 0
        assert "不是学生角色" in data["errors"][0]

    async def test_add_duplicate_student(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
        class_with_student: Class,
        student_user: User,
    ):
        """Test adding student already in class reports error."""
        response = await client.post(
            f"/classes/{class_with_student.id}/students/bulk-add",
            json={"student_ids": [student_user.id]},
            headers=auth_header(admin_token),
        )

        assert response.status_code == 200
        data = response.json()
        assert data["added"] == 0
        assert "已在该班级中" in data["errors"][0]

    async def test_add_student_already_in_other_class_fails(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
        class_with_student: Class,
        student_user: User,
        test_session,
    ):
        other_class = Class(name="九年级一班", grade="九年级")
        test_session.add(other_class)
        await test_session.commit()
        await test_session.refresh(other_class)

        response = await client.post(
            f"/classes/{other_class.id}/students/bulk-add",
            json={"student_ids": [student_user.id]},
            headers=auth_header(admin_token),
        )

        assert response.status_code == 200
        data = response.json()
        assert data["added"] == 0
        assert any("已在班级" in e and class_with_student.name in e for e in data["errors"])


class TestAddTeachersToClass:
    """Tests for POST /classes/{class_id}/teachers/add endpoint."""

    async def test_add_teacher_to_class(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
        test_class: Class,
        test_session,
    ):
        """Test adding teacher to a class."""
        from app.models import User, UserRole, UserStatus
        from app.auth.security import hash_password

        # Create a new teacher to add
        new_teacher = User(
            username="new_teacher_for_class",
            display_name="New Teacher",
            role=UserRole.TEACHER,
            password_hash=hash_password("test123"),
            must_change_password=False,
            status=UserStatus.ACTIVE,
        )
        test_session.add(new_teacher)
        await test_session.commit()
        await test_session.refresh(new_teacher)

        response = await client.post(
            f"/classes/{test_class.id}/teachers/add",
            json={"teacher_ids": [new_teacher.id]},
            headers=auth_header(admin_token),
        )

        assert response.status_code == 200
        data = response.json()
        assert data["added"] == 1
        assert len(data["errors"]) == 0

    async def test_add_student_as_teacher_fails(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
        test_class: Class,
        student_user: User,
    ):
        """Test adding student to teacher list reports error."""
        response = await client.post(
            f"/classes/{test_class.id}/teachers/add",
            json={"teacher_ids": [student_user.id]},
            headers=auth_header(admin_token),
        )

        assert response.status_code == 200
        data = response.json()
        assert data["added"] == 0
        assert "不是教师角色" in data["errors"][0]

    async def test_add_to_nonexistent_class(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
        teacher_user: User,
    ):
        """Test adding to non-existent class returns 404."""
        response = await client.post(
            "/classes/99999/teachers/add",
            json={"teacher_ids": [teacher_user.id]},
            headers=auth_header(admin_token),
        )

        assert response.status_code == 404
