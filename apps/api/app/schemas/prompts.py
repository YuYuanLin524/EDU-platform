from pydantic import BaseModel, Field
from typing import Optional, List
from app.models import ScopeType


class PromptCreate(BaseModel):
    scope_type: ScopeType = ScopeType.GLOBAL
    class_id: Optional[int] = None
    content: str = Field(..., min_length=1)
    auto_activate: bool = True  # 创建后是否立即激活


class PromptInfo(BaseModel):
    id: int
    scope_type: ScopeType
    class_id: Optional[int]
    class_name: Optional[str] = None
    content: str
    version: int
    is_active: bool
    created_by: int
    creator_name: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


class PromptListResponse(BaseModel):
    total: int
    items: List[PromptInfo]


class EffectivePrompt(BaseModel):
    """有效提示词（合并后的最终版本）"""

    global_prompt: Optional[PromptInfo] = None
    class_prompt: Optional[PromptInfo] = None
    merged_content: str  # 合并后的完整提示词
    version: int  # 用于追溯的版本号（取最高优先级的 version）
