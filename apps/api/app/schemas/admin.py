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


class LLMSettingsResponse(BaseModel):
    provider: str
    base_url: str
    model_name: str
    api_key_configured: bool


class LLMSettingsUpdateRequest(BaseModel):
    provider: Optional[str] = None
    base_url: Optional[str] = None
    model_name: Optional[str] = None
    api_key: Optional[str] = None
    clear_api_key: bool = False


class LLMSettingsTestResponse(BaseModel):
    ok: bool
    provider: str
    model_name: str
    latency_ms: int
    error: Optional[str] = None
