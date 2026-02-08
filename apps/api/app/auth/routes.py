from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from app.db.base import get_db
from app.models import User, UserStatus, AuditLog
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    MeResponse,
    UserInfo,
    ChangePasswordRequest,
)
from app.auth.security import verify_password, hash_password, create_access_token
from app.auth.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["认证"])


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """用户登录"""
    result = await db.execute(select(User).where(User.username == request.username))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
        )

    if user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="账号已被禁用",
        )

    # 更新最后登录时间
    user.last_login_at = datetime.utcnow()

    # 记录审计日志
    audit_log = AuditLog(
        actor_id=user.id,
        action="login",
        target_type="user",
        target_id=user.id,
    )
    db.add(audit_log)
    await db.commit()

    access_token = create_access_token(user.id, user.role.value)

    return LoginResponse(
        access_token=access_token,
        must_change_password=user.must_change_password,
        user=UserInfo.model_validate(user),
    )


@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """修改密码（首登必须调用）"""
    if not verify_password(request.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="原密码错误",
        )

    if request.old_password == request.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="新密码不能与原密码相同",
        )

    current_user.password_hash = hash_password(request.new_password)
    current_user.must_change_password = False

    # 记录审计日志
    audit_log = AuditLog(
        actor_id=current_user.id,
        action="change_password",
        target_type="user",
        target_id=current_user.id,
    )
    db.add(audit_log)
    await db.commit()

    return {"message": "密码修改成功"}


@router.get("/me", response_model=MeResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """获取当前用户信息"""
    return MeResponse(
        must_change_password=current_user.must_change_password,
        user=UserInfo.model_validate(current_user),
    )
