from pydantic import BaseModel, Field
from typing import Optional
from app.models import UserRole


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=1)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    must_change_password: bool
    user: "UserInfo"


class MeResponse(BaseModel):
    must_change_password: bool
    user: "UserInfo"


class UserInfo(BaseModel):
    id: int
    username: str
    display_name: Optional[str]
    role: UserRole

    class Config:
        from_attributes = True


class ChangePasswordRequest(BaseModel):
    old_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=6, max_length=128)


class ResetPasswordRequest(BaseModel):
    new_password: Optional[str] = Field(None, min_length=6, max_length=128)
    # 如果 new_password 为空，则自动生成随机密码


class ResetPasswordResponse(BaseModel):
    user_id: int
    username: str
    new_password: str  # 只返回一次


class TokenPayload(BaseModel):
    sub: int  # user_id
    role: UserRole
    exp: int


LoginResponse.model_rebuild()
