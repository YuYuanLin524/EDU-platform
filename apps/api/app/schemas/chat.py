from pydantic import BaseModel, Field
from typing import Optional, List
from app.models import MessageRole


class ConversationCreate(BaseModel):
    class_id: int
    title: Optional[str] = Field(None, max_length=200)


class ConversationInfo(BaseModel):
    id: int
    class_id: int
    class_name: Optional[str] = None
    student_id: int
    student_name: Optional[str] = None
    title: Optional[str]
    first_user_message_preview: Optional[str] = None
    prompt_version: Optional[int]
    model_provider: Optional[str]
    model_name: Optional[str]
    created_at: str
    last_message_at: Optional[str]
    message_count: int = 0

    class Config:
        from_attributes = True


class ConversationListResponse(BaseModel):
    total: int
    items: List[ConversationInfo]


class MessageInfo(BaseModel):
    id: int
    role: MessageRole
    content: str
    created_at: str
    token_in: Optional[int] = None
    token_out: Optional[int] = None

    class Config:
        from_attributes = True


class MessageListResponse(BaseModel):
    conversation_id: int
    messages: List[MessageInfo]


class SendMessageRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=10000)


class SendMessageResponse(BaseModel):
    user_message: MessageInfo
    assistant_message: MessageInfo
    policy_flags: Optional[dict] = None
