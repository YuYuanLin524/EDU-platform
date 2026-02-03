from pydantic import BaseModel, Field
from typing import Optional, List
from app.models import UserRole, UserStatus


class TeacherClassesUpdateRequest(BaseModel):
    class_ids: List[int] = Field(..., min_items=0, max_items=200)


class TeacherClassesUpdateResponse(BaseModel):
    teacher_id: int
    class_names: List[str] = Field(default_factory=list)


class UserImportItem(BaseModel):
    username: str = Field(..., min_length=1, max_length=100)
    display_name: Optional[str] = Field(None, max_length=100)
    role: UserRole
    class_name: Optional[str] = Field(None, max_length=100)  # 学生必填；教师可选（自动绑定班级）


class BulkImportRequest(BaseModel):
    users: List[UserImportItem] = Field(..., min_items=1, max_items=500)


class UserCreatedInfo(BaseModel):
    username: str
    display_name: Optional[str]
    role: UserRole
    initial_password: str  # 只返回一次
    class_name: Optional[str] = None


class BulkImportResponse(BaseModel):
    created_count: int
    users: List[UserCreatedInfo]
    errors: List[str] = []


class UserListItem(BaseModel):
    id: int
    username: str
    display_name: Optional[str]
    role: UserRole
    status: str
    must_change_password: bool
    created_at: str
    last_login_at: Optional[str]
    class_names: List[str] = Field(default_factory=list)

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    total: int
    items: List[UserListItem]


class UpdateUserRequest(BaseModel):
    username: Optional[str] = Field(None, min_length=1, max_length=100)
    display_name: Optional[str] = Field(None, max_length=100)
    status: Optional[UserStatus] = None


class UpdateUserResponse(BaseModel):
    id: int
    username: str
    display_name: Optional[str]
    role: UserRole
    status: str
    message: str


class DeleteUserResponse(BaseModel):
    id: int
    username: str
    message: str


class StudentClassUpdateRequest(BaseModel):
    class_id: int


class StudentClassUpdateResponse(BaseModel):
    student_id: int
    class_id: int
    class_name: str


# System Config Schemas (LLM API Configuration)
class LLMConfigResponse(BaseModel):
    """LLM API 配置响应"""
    provider_name: str = Field(default="", description="服务名称")
    base_url: str = Field(default="", description="API 接口地址")
    api_key_masked: str = Field(default="", description="遮蔽后的 API Key")
    model_name: str = Field(default="", description="模型名称")
    has_api_key: bool = Field(default=False, description="是否已配置 API Key")


class LLMConfigUpdateRequest(BaseModel):
    """LLM API 配置更新请求"""
    provider_name: Optional[str] = Field(None, max_length=100, description="服务名称")
    base_url: Optional[str] = Field(None, max_length=500, description="API 接口地址")
    api_key: Optional[str] = Field(None, max_length=500, description="API Key（为空则不更新）")
    model_name: Optional[str] = Field(None, max_length=200, description="模型名称")


class LLMConfigUpdateResponse(BaseModel):
    """LLM API 配置更新响应"""
    success: bool
    message: str
    config: LLMConfigResponse


class LLMTestRequest(BaseModel):
    """LLM 连接测试请求"""
    provider_name: Optional[str] = Field(None, description="服务名称（可选，用于临时测试）")
    base_url: Optional[str] = Field(None, description="API 接口地址（可选，用于临时测试）")
    api_key: Optional[str] = Field(None, description="API Key（可选，用于临时测试）")
    model_name: Optional[str] = Field(None, description="模型名称（可选，用于临时测试）")


class LLMTestResponse(BaseModel):
    """LLM 连接测试响应"""
    success: bool
    message: str
    latency_ms: Optional[int] = None
    model: Optional[str] = None
