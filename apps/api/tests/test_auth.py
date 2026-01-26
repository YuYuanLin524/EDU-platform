"""
Auth integration tests.

Tests:
- Login with valid/invalid credentials
- Token validation
- Password change flow
- must_change_password enforcement
- Disabled user handling
"""

import pytest
from httpx import AsyncClient
from app.models import User

from tests.conftest import auth_header


class TestLogin:
    """Tests for /auth/login endpoint."""

    async def test_login_success(self, client: AsyncClient, admin_user: User):
        """Test successful login returns token and user info."""
        response = await client.post(
            "/auth/login",
            json={"username": "admin", "password": "admin123"},
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["must_change_password"] is False
        assert data["user"]["username"] == "admin"
        assert data["user"]["role"] == "admin"

    async def test_login_wrong_password(self, client: AsyncClient, admin_user: User):
        """Test login with wrong password returns 401."""
        response = await client.post(
            "/auth/login",
            json={"username": "admin", "password": "wrongpassword"},
        )

        assert response.status_code == 401
        assert "用户名或密码错误" in response.json()["detail"]

    async def test_login_nonexistent_user(self, client: AsyncClient):
        """Test login with non-existent user returns 401."""
        response = await client.post(
            "/auth/login",
            json={"username": "nonexistent", "password": "anypassword"},
        )

        assert response.status_code == 401

    async def test_login_disabled_user(self, client: AsyncClient, disabled_user: User):
        """Test login with disabled user returns 403."""
        response = await client.post(
            "/auth/login",
            json={"username": "disabled", "password": "disabled123"},
        )

        assert response.status_code == 403
        assert "禁用" in response.json()["detail"]

    async def test_login_must_change_password(
        self, client: AsyncClient, new_student_user: User
    ):
        """Test login for user that must change password."""
        response = await client.post(
            "/auth/login",
            json={"username": "newstudent", "password": "initial123"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["must_change_password"] is True


class TestGetMe:
    """Tests for /auth/me endpoint."""

    async def test_get_me_success(
        self, client: AsyncClient, admin_user: User, admin_token: str
    ):
        """Test getting current user info with valid token."""
        response = await client.get("/auth/me", headers=auth_header(admin_token))

        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "admin"
        assert data["role"] == "admin"

    async def test_get_me_no_token(self, client: AsyncClient):
        """Test getting current user info without token returns 401 (Unauthorized)."""
        response = await client.get("/auth/me")

        # HTTPBearer returns 401 when no token provided
        assert response.status_code == 401

    async def test_get_me_invalid_token(self, client: AsyncClient):
        """Test getting current user info with invalid token returns 401."""
        response = await client.get(
            "/auth/me", headers={"Authorization": "Bearer invalidtoken"}
        )

        assert response.status_code == 401


class TestChangePassword:
    """Tests for /auth/change-password endpoint."""

    async def test_change_password_success(
        self, client: AsyncClient, new_student_user: User, new_student_token: str
    ):
        """Test successful password change."""
        response = await client.post(
            "/auth/change-password",
            json={"old_password": "initial123", "new_password": "newpassword123"},
            headers=auth_header(new_student_token),
        )

        assert response.status_code == 200
        assert "成功" in response.json()["message"]

        # Verify can login with new password
        login_response = await client.post(
            "/auth/login",
            json={"username": "newstudent", "password": "newpassword123"},
        )
        assert login_response.status_code == 200
        # must_change_password should now be false
        assert login_response.json()["must_change_password"] is False

    async def test_change_password_wrong_old_password(
        self, client: AsyncClient, new_student_user: User, new_student_token: str
    ):
        """Test password change with wrong old password returns 400."""
        response = await client.post(
            "/auth/change-password",
            json={"old_password": "wrongpassword", "new_password": "newpassword123"},
            headers=auth_header(new_student_token),
        )

        assert response.status_code == 400
        assert "原密码错误" in response.json()["detail"]

    async def test_change_password_same_as_old(
        self, client: AsyncClient, new_student_user: User, new_student_token: str
    ):
        """Test password change with same password returns 400."""
        response = await client.post(
            "/auth/change-password",
            json={"old_password": "initial123", "new_password": "initial123"},
            headers=auth_header(new_student_token),
        )

        assert response.status_code == 400
        assert "相同" in response.json()["detail"]


class TestMustChangePasswordEnforcement:
    """Tests for must_change_password enforcement."""

    async def test_access_protected_endpoint_before_password_change(
        self, client: AsyncClient, new_student_user: User, new_student_token: str
    ):
        """Test that user with must_change_password=True cannot access protected endpoints."""
        # Try to access conversations endpoint (requires active user)
        response = await client.get(
            "/conversations",
            headers=auth_header(new_student_token),
        )

        # Should return 403 with X-Must-Change-Password header
        assert response.status_code == 403
        assert response.headers.get("X-Must-Change-Password") == "true"

    async def test_access_after_password_change(
        self, client: AsyncClient, new_student_user: User, new_student_token: str
    ):
        """Test that user can access endpoints after changing password."""
        # Change password first
        await client.post(
            "/auth/change-password",
            json={"old_password": "initial123", "new_password": "newpassword123"},
            headers=auth_header(new_student_token),
        )

        # Now should be able to access conversations (will return empty list)
        response = await client.get(
            "/conversations",
            headers=auth_header(new_student_token),
        )

        assert response.status_code == 200


class TestRBAC:
    """Tests for role-based access control."""

    async def test_student_cannot_access_admin_endpoint(
        self, client: AsyncClient, student_user: User, student_token: str
    ):
        """Test that students cannot access admin endpoints."""
        response = await client.get(
            "/admin/users",
            headers=auth_header(student_token),
        )

        assert response.status_code == 403
        assert "权限不足" in response.json()["detail"]

    async def test_student_cannot_access_teacher_endpoint(
        self, client: AsyncClient, student_user: User, student_token: str, test_class
    ):
        """Test that students cannot access teacher endpoints."""
        # Use a valid teacher endpoint with class_id
        response = await client.get(
            f"/teacher/classes/{test_class.id}/students",
            headers=auth_header(student_token),
        )

        assert response.status_code == 403

    async def test_teacher_cannot_access_admin_endpoint(
        self, client: AsyncClient, teacher_user: User, teacher_token: str
    ):
        """Test that teachers cannot access admin-only endpoints."""
        response = await client.get(
            "/admin/users",
            headers=auth_header(teacher_token),
        )

        assert response.status_code == 403

    async def test_admin_can_access_admin_endpoint(
        self, client: AsyncClient, admin_user: User, admin_token: str
    ):
        """Test that admins can access admin endpoints."""
        response = await client.get(
            "/admin/users",
            headers=auth_header(admin_token),
        )

        assert response.status_code == 200

    async def test_teacher_can_access_teacher_endpoint(
        self,
        client: AsyncClient,
        teacher_user: User,
        teacher_token: str,
        class_with_teacher,
    ):
        """Test that teachers can access teacher endpoints."""
        response = await client.get(
            f"/teacher/classes/{class_with_teacher.id}/students",
            headers=auth_header(teacher_token),
        )

        assert response.status_code == 200

    async def test_admin_can_access_teacher_endpoint(
        self, client: AsyncClient, admin_user: User, admin_token: str, test_class
    ):
        """Test that admins can also access teacher endpoints."""
        response = await client.get(
            f"/teacher/classes/{test_class.id}/students",
            headers=auth_header(admin_token),
        )

        assert response.status_code == 200
