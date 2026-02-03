"""
Chat integration tests.

Tests:
- Create conversation
- Send message with mocked LLM response
- Get messages
- Permission checks (student only, own conversations)
"""

import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient
from app.models import User, Class, Conversation
from app.llm import ChatResponse

from tests.conftest import auth_header


class MockLLMProvider:
    """Mock LLM provider for testing."""

    def __init__(
        self, response_content: str = "这是一个很好的问题！让我引导你思考一下..."
    ):
        self.response_content = response_content
        self.call_count = 0
        self.last_messages = None

    async def chat(self, messages, temperature=0.7, max_tokens=2048) -> ChatResponse:
        self.call_count += 1
        self.last_messages = messages
        return ChatResponse(
            content=self.response_content,
            token_in=50,
            token_out=30,
            model="test-model",
            provider="test-provider",
            latency_ms=100,
        )

    async def chat_stream(self, messages, temperature=0.7, max_tokens=2048):
        yield self.response_content


class TestCreateConversation:
    """Tests for POST /conversations endpoint."""

    async def test_student_create_conversation(
        self,
        client: AsyncClient,
        student_user: User,
        student_token: str,
        class_with_student: Class,
    ):
        """Test student can create a conversation in their class."""
        response = await client.post(
            "/conversations",
            json={"class_id": class_with_student.id, "title": "帮助我理解循环"},
            headers=auth_header(student_token),
        )

        assert response.status_code == 200
        data = response.json()
        assert data["class_id"] == class_with_student.id
        assert data["title"] == "帮助我理解循环"
        assert data["student_id"] == student_user.id
        assert "id" in data

    async def test_student_cannot_create_in_other_class(
        self,
        client: AsyncClient,
        student_user: User,
        student_token: str,
        test_class: Class,  # Student not enrolled in this class
    ):
        """Test student cannot create conversation in class they're not enrolled in."""
        response = await client.post(
            "/conversations",
            json={"class_id": test_class.id, "title": "Test"},
            headers=auth_header(student_token),
        )

        assert response.status_code == 403
        assert "不属于该班级" in response.json()["detail"]

    async def test_teacher_cannot_create_conversation(
        self,
        client: AsyncClient,
        teacher_user: User,
        teacher_token: str,
        class_with_teacher: Class,
    ):
        """Test teacher cannot create conversation (student-only feature)."""
        response = await client.post(
            "/conversations",
            json={"class_id": class_with_teacher.id, "title": "Test"},
            headers=auth_header(teacher_token),
        )

        assert response.status_code == 403
        assert "学生" in response.json()["detail"]


class TestListConversations:
    """Tests for GET /conversations endpoint."""

    async def test_student_list_conversations(
        self,
        client: AsyncClient,
        student_user: User,
        student_token: str,
        class_with_student: Class,
    ):
        """Test student can list their conversations."""
        # Create a conversation and send a message to get AI response
        create_resp = await client.post(
            "/conversations",
            json={"class_id": class_with_student.id, "title": "Test Conv 1"},
            headers=auth_header(student_token),
        )
        conv_id = create_resp.json()["id"]

        # Send a message to trigger AI response (conversation only appears in list after AI responds)
        mock_provider = MockLLMProvider()
        with patch("app.chat.routes.get_llm_provider", return_value=mock_provider):
            await client.post(
                f"/conversations/{conv_id}/messages",
                json={"content": "Hello"},
                headers=auth_header(student_token),
            )

        # Now list
        response = await client.get(
            "/conversations",
            headers=auth_header(student_token),
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        assert len(data["items"]) >= 1
        assert data["items"][0]["title"] == "Test Conv 1"

    async def test_teacher_cannot_use_student_list(
        self,
        client: AsyncClient,
        teacher_user: User,
        teacher_token: str,
    ):
        """Test teacher should use /teacher/ routes instead."""
        response = await client.get(
            "/conversations",
            headers=auth_header(teacher_token),
        )

        assert response.status_code == 400
        assert "/teacher/" in response.json()["detail"]


class TestSendMessage:
    """Tests for POST /conversations/{id}/messages endpoint."""

    async def test_send_message_success(
        self,
        client: AsyncClient,
        student_user: User,
        student_token: str,
        class_with_student: Class,
    ):
        """Test student can send message and get AI response."""
        # Create conversation
        create_response = await client.post(
            "/conversations",
            json={"class_id": class_with_student.id, "title": "Test"},
            headers=auth_header(student_token),
        )
        conv_id = create_response.json()["id"]

        # Mock the LLM provider
        mock_provider = MockLLMProvider(
            response_content="很好的问题！首先，让我问你：你认为循环的作用是什么？"
        )

        with patch("app.chat.routes.get_llm_provider", return_value=mock_provider):
            response = await client.post(
                f"/conversations/{conv_id}/messages",
                json={"content": "什么是for循环？"},
                headers=auth_header(student_token),
            )

        assert response.status_code == 200
        data = response.json()

        # Check user message
        assert data["user_message"]["role"] == "user"
        assert data["user_message"]["content"] == "什么是for循环？"

        # Check AI response
        assert data["assistant_message"]["role"] == "assistant"
        assert "循环" in data["assistant_message"]["content"]

        # Check policy flags
        assert data["policy_flags"]["provider"] == "test-provider"
        assert data["policy_flags"]["latency_ms"] == 100

        # Verify LLM was called
        assert mock_provider.call_count == 1

    async def test_send_message_to_nonexistent_conversation(
        self,
        client: AsyncClient,
        student_user: User,
        student_token: str,
        class_with_student: Class,
    ):
        """Test sending message to non-existent conversation returns 404."""
        mock_provider = MockLLMProvider()

        with patch("app.chat.routes.get_llm_provider", return_value=mock_provider):
            response = await client.post(
                "/conversations/99999/messages",
                json={"content": "Hello"},
                headers=auth_header(student_token),
            )

        assert response.status_code == 404

    async def test_send_message_to_other_student_conversation(
        self,
        client: AsyncClient,
        student_user: User,
        student_token: str,
        admin_user: User,
        admin_token: str,
        test_session,
        class_with_student: Class,
    ):
        """Test student cannot send message to another student's conversation."""
        # Create another student and enroll in same class
        from app.models import User, UserRole, UserStatus, ClassStudent
        from app.auth.security import hash_password

        other_student = User(
            username="other_student",
            display_name="Other Student",
            role=UserRole.STUDENT,
            password_hash=hash_password("other123"),
            must_change_password=False,
            status=UserStatus.ACTIVE,
        )
        test_session.add(other_student)
        await test_session.commit()
        await test_session.refresh(other_student)

        # Enroll other student
        class_student = ClassStudent(
            class_id=class_with_student.id, student_id=other_student.id
        )
        test_session.add(class_student)
        await test_session.commit()

        # Create conversation for other student
        from app.auth.security import create_access_token

        other_token = create_access_token(other_student.id, other_student.role.value)

        create_response = await client.post(
            "/conversations",
            json={"class_id": class_with_student.id, "title": "Other's Conv"},
            headers=auth_header(other_token),
        )
        other_conv_id = create_response.json()["id"]

        # Try to send message as original student
        mock_provider = MockLLMProvider()

        with patch("app.chat.routes.get_llm_provider", return_value=mock_provider):
            response = await client.post(
                f"/conversations/{other_conv_id}/messages",
                json={"content": "Hello"},
                headers=auth_header(student_token),
            )

        assert response.status_code == 403
        assert "无权" in response.json()["detail"]

    async def test_llm_error_handled(
        self,
        client: AsyncClient,
        student_user: User,
        student_token: str,
        class_with_student: Class,
    ):
        """Test that LLM errors are handled gracefully."""
        # Create conversation
        create_response = await client.post(
            "/conversations",
            json={"class_id": class_with_student.id, "title": "Test"},
            headers=auth_header(student_token),
        )
        conv_id = create_response.json()["id"]

        # Mock LLM provider to raise an error
        mock_provider = MockLLMProvider()

        async def raise_error(*args, **kwargs):
            raise Exception("API quota exceeded")

        mock_provider.chat = raise_error

        with patch("app.chat.routes.get_llm_provider", return_value=mock_provider):
            response = await client.post(
                f"/conversations/{conv_id}/messages",
                json={"content": "Hello"},
                headers=auth_header(student_token),
            )

        # Should still return 200 but with error message in response
        assert response.status_code == 200
        data = response.json()
        assert "暂时不可用" in data["assistant_message"]["content"]
        assert "error" in data["policy_flags"]


class TestGetMessages:
    """Tests for GET /conversations/{id}/messages endpoint."""

    async def test_student_get_own_messages(
        self,
        client: AsyncClient,
        student_user: User,
        student_token: str,
        class_with_student: Class,
    ):
        """Test student can get messages from their conversation."""
        # Create conversation
        create_response = await client.post(
            "/conversations",
            json={"class_id": class_with_student.id, "title": "Test"},
            headers=auth_header(student_token),
        )
        conv_id = create_response.json()["id"]

        # Send a message
        mock_provider = MockLLMProvider(response_content="Let me help you think...")

        with patch("app.chat.routes.get_llm_provider", return_value=mock_provider):
            await client.post(
                f"/conversations/{conv_id}/messages",
                json={"content": "Hello"},
                headers=auth_header(student_token),
            )

        # Get messages
        response = await client.get(
            f"/conversations/{conv_id}/messages",
            headers=auth_header(student_token),
        )

        assert response.status_code == 200
        data = response.json()
        assert data["conversation_id"] == conv_id
        assert len(data["messages"]) == 2  # User message + AI response

        # Check order (should be chronological)
        assert data["messages"][0]["role"] == "user"
        assert data["messages"][1]["role"] == "assistant"

    async def test_student_cannot_get_other_messages(
        self,
        client: AsyncClient,
        student_user: User,
        student_token: str,
        test_session,
        class_with_student: Class,
    ):
        """Test student cannot get messages from another student's conversation."""
        from app.models import User, UserRole, UserStatus, ClassStudent
        from app.auth.security import hash_password, create_access_token

        # Create another student and their conversation
        other_student = User(
            username="other_student2",
            display_name="Other Student 2",
            role=UserRole.STUDENT,
            password_hash=hash_password("other123"),
            must_change_password=False,
            status=UserStatus.ACTIVE,
        )
        test_session.add(other_student)
        await test_session.commit()
        await test_session.refresh(other_student)

        class_student = ClassStudent(
            class_id=class_with_student.id, student_id=other_student.id
        )
        test_session.add(class_student)
        await test_session.commit()

        other_token = create_access_token(other_student.id, other_student.role.value)

        create_response = await client.post(
            "/conversations",
            json={"class_id": class_with_student.id, "title": "Other's Conv"},
            headers=auth_header(other_token),
        )
        other_conv_id = create_response.json()["id"]

        # Try to get messages as original student
        response = await client.get(
            f"/conversations/{other_conv_id}/messages",
            headers=auth_header(student_token),
        )

        assert response.status_code == 403

    async def test_teacher_can_view_student_messages(
        self,
        client: AsyncClient,
        teacher_user: User,
        teacher_token: str,
        student_user: User,
        student_token: str,
        fully_setup_class: Class,
    ):
        """Test teacher can view messages from student conversations."""
        # Create conversation as student
        create_response = await client.post(
            "/conversations",
            json={"class_id": fully_setup_class.id, "title": "Student Conv"},
            headers=auth_header(student_token),
        )
        conv_id = create_response.json()["id"]

        # Send a message
        mock_provider = MockLLMProvider()

        with patch("app.chat.routes.get_llm_provider", return_value=mock_provider):
            await client.post(
                f"/conversations/{conv_id}/messages",
                json={"content": "Hello"},
                headers=auth_header(student_token),
            )

        # Teacher should be able to view messages
        response = await client.get(
            f"/conversations/{conv_id}/messages",
            headers=auth_header(teacher_token),
        )

        assert response.status_code == 200
        assert len(response.json()["messages"]) == 2
