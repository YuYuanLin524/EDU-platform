from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime
from typing import List, AsyncGenerator
import json
from app.db.base import get_db
from app.models import (
    User,
    UserRole,
    Conversation,
    Message,
    MessageRole,
    Class,
    ClassStudent,
    PromptScope,
    ScopeType,
)
from app.schemas.chat import (
    ConversationCreate,
    ConversationInfo,
    ConversationListResponse,
    MessageInfo,
    MessageListResponse,
    SendMessageRequest,
    SendMessageResponse,
)
from app.auth.deps import get_current_active_user
from app.llm import get_llm_provider, ChatMessage
from app.prompts import DEFAULT_SYSTEM_PROMPT
from app.config import get_settings

router = APIRouter(prefix="/conversations", tags=["对话"])
settings = get_settings()
AI_UNAVAILABLE_MESSAGE = "抱歉，AI 服务暂时不可用，请稍后重试"


async def get_effective_prompt_content(
    db: AsyncSession, class_id: int
) -> tuple[str, int]:
    """获取有效的合并提示词和版本号"""
    merged_parts = [DEFAULT_SYSTEM_PROMPT]
    version = 0

    # 全局提示词
    global_result = await db.execute(
        select(PromptScope).where(
            PromptScope.scope_type == ScopeType.GLOBAL,
            PromptScope.is_active == True,
        )
    )
    global_prompt = global_result.scalar_one_or_none()
    if global_prompt:
        merged_parts.append(f"\n\n【全局配置】\n{global_prompt.content}")
        version = global_prompt.version

    # 班级提示词
    class_result = await db.execute(
        select(PromptScope).where(
            PromptScope.scope_type == ScopeType.CLASS,
            PromptScope.class_id == class_id,
            PromptScope.is_active == True,
        )
    )
    class_prompt = class_result.scalar_one_or_none()
    if class_prompt:
        merged_parts.append(f"\n\n【班级配置】\n{class_prompt.content}")
        version = class_prompt.version

    return "".join(merged_parts), version


async def _require_student_conversation(
    db: AsyncSession,
    conversation_id: int,
    current_user: User,
) -> Conversation:
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只有学生可以发送消息",
        )

    conv_result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conversation = conv_result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="对话不存在")

    if conversation.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权操作该对话",
        )

    return conversation


async def _get_conversation_history(
    db: AsyncSession,
    conversation_id: int,
) -> list[Message]:
    msg_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
    )
    return list(msg_result.scalars().all())


def _build_chat_messages(
    system_prompt: str,
    history_messages: list[Message],
    user_content: str,
) -> list[ChatMessage]:
    chat_messages = [ChatMessage(role="system", content=system_prompt)]
    for history_message in history_messages:
        chat_messages.append(
            ChatMessage(role=history_message.role.value, content=history_message.content)
        )
    chat_messages.append(ChatMessage(role="user", content=user_content))
    return chat_messages


async def _build_chat_context(
    db: AsyncSession,
    conversation: Conversation,
    user_content: str,
) -> tuple[list[Message], list[ChatMessage]]:
    system_prompt, _ = await get_effective_prompt_content(db, conversation.class_id)
    history_messages = await _get_conversation_history(db, conversation.id)
    chat_messages = _build_chat_messages(system_prompt, history_messages, user_content)
    return history_messages, chat_messages


async def _create_user_message(
    db: AsyncSession,
    conversation_id: int,
    content: str,
) -> Message:
    user_message = Message(
        conversation_id=conversation_id,
        role=MessageRole.USER,
        content=content,
        created_at=datetime.utcnow(),
    )
    db.add(user_message)
    await db.flush()
    return user_message


async def _create_assistant_message(
    db: AsyncSession,
    conversation_id: int,
    content: str,
    policy_flags: dict[str, object] | None = None,
    token_in: int | None = None,
    token_out: int | None = None,
) -> Message:
    assistant_message = Message(
        conversation_id=conversation_id,
        role=MessageRole.ASSISTANT,
        content=content,
        created_at=datetime.utcnow(),
        token_in=token_in,
        token_out=token_out,
        policy_flags=policy_flags,
    )
    db.add(assistant_message)
    await db.flush()
    return assistant_message


def _build_policy_flags_from_response(response: object) -> dict[str, object]:
    """Build policy flags from provider response."""
    return {
        "provider": response.provider,
        "model": response.model,
        "latency_ms": response.latency_ms,
    }


def _build_ai_unavailable_content(error: Exception) -> str:
    return f"{AI_UNAVAILABLE_MESSAGE}。错误信息：{str(error)}"


def _message_event_payload(
    message: Message,
    content_override: str | None = None,
) -> dict[str, object]:
    return {
        "id": message.id,
        "role": message.role.value,
        "content": message.content if content_override is None else content_override,
        "created_at": message.created_at.isoformat() if message.created_at else "",
        "token_in": message.token_in,
        "token_out": message.token_out,
    }


def _format_sse_event(event: str, payload: dict[str, object]) -> str:
    return (
        f"event: {event}\n"
        f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
    )


async def _persist_stream_error(
    db: AsyncSession,
    conversation: Conversation,
    user_message: Message,
    assistant_message: Message,
    has_prior_assistant: bool,
    error: Exception,
    policy_flags: dict[str, object],
) -> bool:
    if not has_prior_assistant:
        await db.delete(assistant_message)
        await db.delete(user_message)
        await db.delete(conversation)
        await db.commit()
        return True

    assistant_message.content = _build_ai_unavailable_content(error)
    assistant_message.policy_flags = policy_flags
    conversation.last_message_at = datetime.utcnow()
    await db.commit()
    return False


@router.post("", response_model=ConversationInfo)
async def create_conversation(
    request: ConversationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """创建新对话会话（学生专用）"""
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="只有学生可以创建对话"
        )

    # 检查学生是否属于该班级
    student_check = await db.execute(
        select(ClassStudent).where(
            ClassStudent.class_id == request.class_id,
            ClassStudent.student_id == current_user.id,
        )
    )
    if not student_check.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="你不属于该班级"
        )

    # 获取有效提示词版本
    _, prompt_version = await get_effective_prompt_content(db, request.class_id)

    conversation = Conversation(
        class_id=request.class_id,
        student_id=current_user.id,
        title=request.title,
        prompt_version=prompt_version,
        model_provider=settings.model_provider,
        model_name=settings.model_name,
        created_at=datetime.utcnow(),
    )
    db.add(conversation)
    await db.commit()
    await db.refresh(conversation)

    # 获取班级名称
    class_result = await db.execute(select(Class).where(Class.id == request.class_id))
    class_obj = class_result.scalar_one_or_none()

    return ConversationInfo(
        id=conversation.id,
        class_id=conversation.class_id,
        class_name=class_obj.name if class_obj else None,
        student_id=conversation.student_id,
        student_name=current_user.display_name or current_user.username,
        title=conversation.title,
        prompt_version=conversation.prompt_version,
        model_provider=conversation.model_provider,
        model_name=conversation.model_name,
        created_at=conversation.created_at.isoformat()
        if conversation.created_at
        else "",
        last_message_at=None,
        message_count=0,
    )


@router.get("", response_model=ConversationListResponse)
async def list_conversations(
    class_id: int = None,
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """获取对话列表

    - 学生：只能看自己的对话
    - 教师/超管：通过 /teacher/ 路由查看
    """
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="教师/超管请使用 /teacher/classes/{class_id}/students/{student_id}/conversations 接口",
        )

    assistant_exists = (
        select(Message.id)
        .where(
            Message.conversation_id == Conversation.id,
            Message.role == MessageRole.ASSISTANT,
        )
        .exists()
    )
    query = select(Conversation).where(
        Conversation.student_id == current_user.id, assistant_exists
    )
    count_query = select(func.count(Conversation.id)).where(
        Conversation.student_id == current_user.id, assistant_exists
    )

    if class_id:
        query = query.where(Conversation.class_id == class_id)
        count_query = count_query.where(Conversation.class_id == class_id)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(
        Conversation.last_message_at.desc().nullslast(), Conversation.created_at.desc()
    )
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    conversations = result.scalars().all()

    items = []
    for conv in conversations:
        # 获取消息数量
        msg_count_result = await db.execute(
            select(func.count(Message.id)).where(Message.conversation_id == conv.id)
        )
        msg_count = msg_count_result.scalar() or 0

        # 获取班级名称
        class_result = await db.execute(select(Class).where(Class.id == conv.class_id))
        class_obj = class_result.scalar_one_or_none()

        # 获取首条用户消息预览（用于无标题时展示）
        first_user_msg_result = await db.execute(
            select(Message.content)
            .where(
                Message.conversation_id == conv.id,
                Message.role == MessageRole.USER,
            )
            .order_by(Message.created_at.asc())
            .limit(1)
        )
        first_user_message_preview = first_user_msg_result.scalar_one_or_none()

        items.append(
            ConversationInfo(
                id=conv.id,
                class_id=conv.class_id,
                class_name=class_obj.name if class_obj else None,
                student_id=conv.student_id,
                student_name=current_user.display_name or current_user.username,
                title=conv.title,
                first_user_message_preview=first_user_message_preview,
                prompt_version=conv.prompt_version,
                model_provider=conv.model_provider,
                model_name=conv.model_name,
                created_at=conv.created_at.isoformat() if conv.created_at else "",
                last_message_at=conv.last_message_at.isoformat()
                if conv.last_message_at
                else None,
                message_count=msg_count,
            )
        )

    return ConversationListResponse(total=total, items=items)


@router.get("/{conversation_id}/messages", response_model=MessageListResponse)
async def get_messages(
    conversation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """获取对话消息列表"""
    conv_result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conversation = conv_result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="对话不存在")

    # 权限检查：学生只能看自己的对话
    if (
        current_user.role == UserRole.STUDENT
        and conversation.student_id != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="无权查看该对话"
        )

    # 获取消息
    msg_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
    )
    messages = msg_result.scalars().all()

    items = [
        MessageInfo(
            id=m.id,
            role=m.role,
            content=m.content,
            created_at=m.created_at.isoformat() if m.created_at else "",
            token_in=m.token_in,
            token_out=m.token_out,
        )
        for m in messages
    ]

    return MessageListResponse(conversation_id=conversation_id, messages=items)


@router.post("/{conversation_id}/messages", response_model=SendMessageResponse)
async def send_message(
    conversation_id: int,
    request: SendMessageRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """发送消息并获取 AI 回复（学生专用）"""
    conversation = await _require_student_conversation(db, conversation_id, current_user)
    history_messages, chat_messages = await _build_chat_context(
        db,
        conversation,
        request.content,
    )

    user_message = await _create_user_message(db, conversation_id, request.content)

    has_prior_assistant = any(m.role == MessageRole.ASSISTANT for m in history_messages)

    # 调用 LLM
    provider = get_llm_provider()
    policy_flags = {}

    try:
        response = await provider.chat(chat_messages)

        policy_flags = _build_policy_flags_from_response(response)

        assistant_message = await _create_assistant_message(
            db=db,
            conversation_id=conversation_id,
            content=response.content,
            policy_flags=policy_flags,
            token_in=response.token_in,
            token_out=response.token_out,
        )

    except Exception as e:
        policy_flags["error"] = str(e)
        if not has_prior_assistant:
            await db.delete(user_message)
            await db.delete(conversation)
            await db.commit()
            # Return 200 with error message instead of 502.
            return SendMessageResponse(
                user_message=MessageInfo(
                    id=user_message.id,
                    role=user_message.role.value,
                    content=user_message.content,
                    created_at=(
                        user_message.created_at.isoformat()
                        if user_message.created_at
                        else ""
                    ),
                ),
                assistant_message=MessageInfo(
                    id=0,
                    role=MessageRole.ASSISTANT.value,
                    content=_build_ai_unavailable_content(e),
                    created_at=datetime.utcnow().isoformat(),
                ),
                policy_flags=policy_flags,
            )

        assistant_message = await _create_assistant_message(
            db=db,
            conversation_id=conversation_id,
            content=_build_ai_unavailable_content(e),
            policy_flags=policy_flags,
        )

    conversation.last_message_at = datetime.utcnow()

    await db.commit()
    await db.refresh(user_message)
    await db.refresh(assistant_message)

    return SendMessageResponse(
        user_message=MessageInfo(
            id=user_message.id,
            role=user_message.role,
            content=user_message.content,
            created_at=user_message.created_at.isoformat()
            if user_message.created_at
            else "",
        ),
        assistant_message=MessageInfo(
            id=assistant_message.id,
            role=assistant_message.role,
            content=assistant_message.content,
            created_at=assistant_message.created_at.isoformat()
            if assistant_message.created_at
            else "",
            token_in=assistant_message.token_in,
            token_out=assistant_message.token_out,
        ),
        policy_flags=policy_flags,
    )


@router.post("/{conversation_id}/messages/stream")
async def stream_message(
    conversation_id: int,
    request: SendMessageRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """流式发送消息并获取 AI 回复（学生专用）"""
    conversation = await _require_student_conversation(db, conversation_id, current_user)
    history_messages, chat_messages = await _build_chat_context(
        db,
        conversation,
        request.content,
    )

    user_message = await _create_user_message(db, conversation_id, request.content)

    assistant_message = await _create_assistant_message(
        db=db,
        conversation_id=conversation_id,
        content="",
        policy_flags={},
    )

    has_prior_assistant = any(m.role == MessageRole.ASSISTANT for m in history_messages)
    provider = get_llm_provider()

    async def event_stream() -> AsyncGenerator[str, None]:
        policy_flags = {}
        assistant_content = ""

        try:
            yield _format_sse_event(
                "meta",
                {
                    "type": "meta",
                    "user_message": _message_event_payload(user_message),
                    "assistant_message": _message_event_payload(
                        assistant_message,
                        content_override="",
                    ),
                },
            )

            async for chunk in provider.chat_stream(chat_messages):
                assistant_content += chunk
                yield _format_sse_event("delta", {"type": "delta", "delta": chunk})

            assistant_message.content = assistant_content
            assistant_message.policy_flags = policy_flags
            conversation.last_message_at = datetime.utcnow()
            await db.commit()
            yield _format_sse_event(
                "done",
                {"type": "done", "policy_flags": policy_flags},
            )
        except Exception as e:
            policy_flags["error"] = str(e)
            deleted_all = await _persist_stream_error(
                db=db,
                conversation=conversation,
                user_message=user_message,
                assistant_message=assistant_message,
                has_prior_assistant=has_prior_assistant,
                error=e,
                policy_flags=policy_flags,
            )

            yield _format_sse_event(
                "error",
                {"type": "error", "message": AI_UNAVAILABLE_MESSAGE},
            )

            if deleted_all:
                return

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # 禁用 Nginx 缓冲
        },
    )
