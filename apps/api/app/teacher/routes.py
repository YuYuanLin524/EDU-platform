from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.base import get_db
from app.models import (
    User,
    UserRole,
    Conversation,
    Message,
    MessageRole,
    Class,
    ClassStudent,
    ClassTeacher,
)
from app.schemas.chat import (
    ConversationInfo,
    ConversationListResponse,
    MessageInfo,
    MessageListResponse,
)
from app.schemas.classes import StudentInClass
from app.auth.deps import get_current_active_user, require_teacher

router = APIRouter(prefix="/teacher", tags=["教师审计"])


async def check_teacher_class_permission(
    db: AsyncSession,
    teacher_id: int,
    class_id: int,
    teacher_role: UserRole,
) -> bool:
    """检查教师是否有权限访问该班级"""
    if teacher_role == UserRole.ADMIN:
        return True

    result = await db.execute(
        select(ClassTeacher).where(
            ClassTeacher.class_id == class_id,
            ClassTeacher.teacher_id == teacher_id,
        )
    )
    return result.scalar_one_or_none() is not None


@router.get("/classes/{class_id}/students")
async def get_class_students(
    class_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    """获取班级学生列表（教师专用）"""
    if not await check_teacher_class_permission(
        db, current_user.id, class_id, current_user.role
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="无权访问该班级"
        )

    result = await db.execute(
        select(User)
        .join(ClassStudent, User.id == ClassStudent.student_id)
        .where(ClassStudent.class_id == class_id)
    )
    students = result.scalars().all()

    items = []
    for s in students:
        # 获取学生的对话数和最后活跃时间
        conv_result = await db.execute(
            select(
                func.count(Conversation.id), func.max(Conversation.last_message_at)
            ).where(Conversation.student_id == s.id, Conversation.class_id == class_id)
        )
        conv_count, last_active = conv_result.one()

        items.append(
            {
                "id": s.id,
                "username": s.username,
                "display_name": s.display_name,
                "last_login_at": s.last_login_at.isoformat()
                if s.last_login_at
                else None,
                "conversation_count": conv_count or 0,
                "last_active_at": last_active.isoformat() if last_active else None,
            }
        )

    return {"students": items}


@router.get(
    "/classes/{class_id}/students/{student_id}/conversations",
    response_model=ConversationListResponse,
)
async def get_student_conversations(
    class_id: int,
    student_id: int,
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    """获取指定学生的对话列表（教师专用）"""
    if not await check_teacher_class_permission(
        db, current_user.id, class_id, current_user.role
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="无权访问该班级"
        )

    # 验证学生属于该班级
    student_check = await db.execute(
        select(ClassStudent).where(
            ClassStudent.class_id == class_id,
            ClassStudent.student_id == student_id,
        )
    )
    if not student_check.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="学生不属于该班级"
        )

    # 获取学生信息
    student_result = await db.execute(select(User).where(User.id == student_id))
    student = student_result.scalar_one_or_none()

    # 获取班级信息
    class_result = await db.execute(select(Class).where(Class.id == class_id))
    class_obj = class_result.scalar_one_or_none()

    assistant_exists = (
        select(Message.id)
        .where(
            Message.conversation_id == Conversation.id,
            Message.role == MessageRole.ASSISTANT,
        )
        .exists()
    )

    # 查询对话
    query = select(Conversation).where(
        Conversation.class_id == class_id,
        Conversation.student_id == student_id,
        assistant_exists,
    )
    count_query = select(func.count(Conversation.id)).where(
        Conversation.class_id == class_id,
        Conversation.student_id == student_id,
        assistant_exists,
    )

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
        msg_count_result = await db.execute(
            select(func.count(Message.id)).where(Message.conversation_id == conv.id)
        )
        msg_count = msg_count_result.scalar() or 0

        items.append(
            ConversationInfo(
                id=conv.id,
                class_id=conv.class_id,
                class_name=class_obj.name if class_obj else None,
                student_id=conv.student_id,
                student_name=student.display_name or student.username
                if student
                else None,
                title=conv.title,
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


@router.get(
    "/conversations/{conversation_id}/messages", response_model=MessageListResponse
)
async def get_conversation_messages(
    conversation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    """获取对话消息详情（教师专用）"""
    conv_result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conversation = conv_result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="对话不存在")

    # 检查教师权限
    if not await check_teacher_class_permission(
        db, current_user.id, conversation.class_id, current_user.role
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
