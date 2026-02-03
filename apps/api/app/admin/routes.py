import secrets
import string
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete, update
from sqlalchemy.exc import IntegrityError
from datetime import datetime
from typing import Optional
from app.db.base import get_db
from app.models import (
    User,
    UserRole,
    UserStatus,
    Class,
    ClassStudent,
    ClassTeacher,
    AuditLog,
    PromptScope,
    ExportJob,
    SystemConfig,
)
from app.schemas.admin import (
    BulkImportRequest,
    BulkImportResponse,
    UserCreatedInfo,
    UserListResponse,
    UserListItem,
    TeacherClassesUpdateRequest,
    TeacherClassesUpdateResponse,
    StudentClassUpdateRequest,
    StudentClassUpdateResponse,
    UpdateUserRequest,
    UpdateUserResponse,
    DeleteUserResponse,
    LLMConfigResponse,
    LLMConfigUpdateRequest,
    LLMConfigUpdateResponse,
    LLMTestRequest,
    LLMTestResponse,
)
from app.schemas.auth import ResetPasswordRequest, ResetPasswordResponse
from app.auth.security import hash_password
from app.auth.deps import require_admin

router = APIRouter(prefix="/admin", tags=["超管"])


def generate_random_password(length: int = 12) -> str:
    """生成随机密码"""
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


@router.post("/users/bulk-import", response_model=BulkImportResponse)
async def bulk_import_users(
    request: BulkImportRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """批量导入用户（超管专用）

    - 自动生成初始密码（只返回一次）
    - 可选绑定班级
    - 用户首登必须改密码
    """
    created_users = []
    errors = []

    # 获取所有涉及的班级
    class_names = set(u.class_name for u in request.users if u.class_name)
    class_map = {}
    if class_names:
        result = await db.execute(select(Class).where(Class.name.in_(class_names)))
        for c in result.scalars().all():
            class_map[c.name] = c

    for item in request.users:
        class_obj = class_map.get(item.class_name) if item.class_name else None
        if item.role == UserRole.STUDENT:
            if not item.class_name:
                errors.append(f"学生 {item.username} 必须选择班级")
                continue
            if not class_obj:
                errors.append(f"班级 {item.class_name} 不存在，已拒绝创建学生 {item.username}")
                continue

        # 检查用户名是否已存在
        existing = await db.execute(select(User).where(User.username == item.username))
        if existing.scalar_one_or_none():
            errors.append(f"用户名 {item.username} 已存在")
            continue

        # 生成初始密码
        initial_password = generate_random_password()

        # 创建用户
        user = User(
            username=item.username,
            display_name=item.display_name,
            role=item.role,
            password_hash=hash_password(initial_password),
            must_change_password=True,
            status=UserStatus.ACTIVE,
            created_at=datetime.utcnow(),
        )
        db.add(user)
        await db.flush()  # 获取 user.id

        # 绑定班级
        bound_class_name = None
        if item.class_name:
            if not class_obj:
                errors.append(
                    f"班级 {item.class_name} 不存在，用户 {item.username} 已创建但未绑定班级"
                )
            else:
                if item.role == UserRole.STUDENT:
                    db.add(
                        ClassStudent(
                            class_id=class_obj.id,
                            student_id=user.id,
                            created_at=datetime.utcnow(),
                        )
                    )
                    bound_class_name = item.class_name
                elif item.role == UserRole.TEACHER:
                    db.add(
                        ClassTeacher(
                            class_id=class_obj.id,
                            teacher_id=user.id,
                            created_at=datetime.utcnow(),
                        )
                    )
                    bound_class_name = item.class_name

        created_users.append(
            UserCreatedInfo(
                username=item.username,
                display_name=item.display_name,
                role=item.role,
                initial_password=initial_password,
                class_name=bound_class_name,
            )
        )

    # 记录审计日志
    audit_log = AuditLog(
        actor_id=admin.id,
        action="bulk_import",
        target_type="user",
        meta={
            "count": len(created_users),
            "roles": [u.role.value for u in created_users],
        },
        created_at=datetime.utcnow(),
    )
    db.add(audit_log)

    await db.commit()

    return BulkImportResponse(
        created_count=len(created_users),
        users=created_users,
        errors=errors,
    )


@router.get("/users", response_model=UserListResponse)
async def list_users(
    role: Optional[UserRole] = None,
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """获取用户列表（排除管理员用户）"""
    # 始终排除管理员用户
    query = select(User).where(User.role != UserRole.ADMIN)
    count_query = select(func.count(User.id)).where(User.role != UserRole.ADMIN)

    if role:
        query = query.where(User.role == role)
        count_query = count_query.where(User.role == role)

    # 计算总数
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # 分页查询
    query = query.order_by(User.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    users = result.scalars().all()

    user_ids = [u.id for u in users]
    student_class_map: dict[int, list[str]] = {}
    teacher_class_map: dict[int, list[str]] = {}

    if user_ids:
        student_result = await db.execute(
            select(ClassStudent.student_id, Class.name)
            .join(Class, Class.id == ClassStudent.class_id)
            .where(ClassStudent.student_id.in_(user_ids))
        )
        for student_id, class_name in student_result.all():
            student_class_map.setdefault(student_id, []).append(class_name)

        teacher_result = await db.execute(
            select(ClassTeacher.teacher_id, Class.name)
            .join(Class, Class.id == ClassTeacher.class_id)
            .where(ClassTeacher.teacher_id.in_(user_ids))
        )
        for teacher_id, class_name in teacher_result.all():
            teacher_class_map.setdefault(teacher_id, []).append(class_name)

    items = [
        UserListItem(
            id=u.id,
            username=u.username,
            display_name=u.display_name,
            role=u.role,
            status=u.status.value,
            must_change_password=u.must_change_password,
            created_at=u.created_at.isoformat() if u.created_at else "",
            last_login_at=u.last_login_at.isoformat() if u.last_login_at else None,
            class_names=student_class_map.get(u.id, [])
            if u.role == UserRole.STUDENT
            else teacher_class_map.get(u.id, [])
            if u.role == UserRole.TEACHER
            else [],
        )
        for u in users
    ]

    return UserListResponse(total=total, items=items)


@router.post("/users/{user_id}/reset-password", response_model=ResetPasswordResponse)
async def reset_password(
    user_id: int,
    request: Optional[ResetPasswordRequest] = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """重置用户密码（超管专用）"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")

    # 生成或使用指定的新密码
    new_password = (
        request.new_password
        if request and request.new_password
        else generate_random_password()
    )

    user.password_hash = hash_password(new_password)
    user.must_change_password = True

    # 记录审计日志
    audit_log = AuditLog(
        actor_id=admin.id,
        action="reset_password",
        target_type="user",
        target_id=user.id,
        created_at=datetime.utcnow(),
    )
    db.add(audit_log)

    await db.commit()

    return ResetPasswordResponse(
        user_id=user.id,
        username=user.username,
        new_password=new_password,
    )


@router.patch("/users/{user_id}", response_model=UpdateUserResponse)
async def update_user(
    user_id: int,
    request: UpdateUserRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """更新用户信息（超管专用）"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")

    # 检查新用户名是否与其他用户冲突
    if request.username is not None and request.username != user.username:
        existing = await db.execute(
            select(User).where(User.username == request.username)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"学号/工号 {request.username} 已被使用",
            )
        user.username = request.username

    # 更新字段
    if request.display_name is not None:
        user.display_name = request.display_name
    if request.status is not None:
        user.status = request.status

    # 记录审计日志
    audit_log = AuditLog(
        actor_id=admin.id,
        action="update_user",
        target_type="user",
        target_id=user.id,
        meta={
            "username": request.username,
            "display_name": request.display_name,
            "status": request.status.value if request.status else None,
        },
        created_at=datetime.utcnow(),
    )
    db.add(audit_log)

    await db.commit()

    return UpdateUserResponse(
        id=user.id,
        username=user.username,
        display_name=user.display_name,
        role=user.role,
        status=user.status.value,
        message="更新成功",
    )


@router.put("/teachers/{teacher_id}/classes", response_model=TeacherClassesUpdateResponse)
async def set_teacher_classes(
    teacher_id: int,
    request: TeacherClassesUpdateRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    result = await db.execute(select(User).where(User.id == teacher_id))
    teacher = result.scalar_one_or_none()
    if not teacher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")
    if teacher.role != UserRole.TEACHER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="仅支持设置教师的授课班级"
        )

    class_ids = list(dict.fromkeys(request.class_ids))
    class_names: list[str] = []
    if class_ids:
        classes_result = await db.execute(select(Class).where(Class.id.in_(class_ids)))
        classes = classes_result.scalars().all()
        found_ids = {c.id for c in classes}
        missing = [cid for cid in class_ids if cid not in found_ids]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"班级不存在：{missing}",
            )
        class_names = [c.name for c in sorted(classes, key=lambda x: x.name)]

    await db.execute(delete(ClassTeacher).where(ClassTeacher.teacher_id == teacher_id))
    for cid in class_ids:
        db.add(
            ClassTeacher(
                class_id=cid,
                teacher_id=teacher_id,
                created_at=datetime.utcnow(),
            )
        )

    audit_log = AuditLog(
        actor_id=admin.id,
        action="set_teacher_classes",
        target_type="teacher",
        target_id=teacher_id,
        meta={"class_ids": class_ids},
        created_at=datetime.utcnow(),
    )
    db.add(audit_log)

    await db.commit()

    return TeacherClassesUpdateResponse(teacher_id=teacher_id, class_names=class_names)


@router.put("/students/{student_id}/class", response_model=StudentClassUpdateResponse)
async def set_student_class(
    student_id: int,
    request: StudentClassUpdateRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    result = await db.execute(select(User).where(User.id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")
    if student.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="仅支持设置学生的所属班级"
        )

    class_result = await db.execute(select(Class).where(Class.id == request.class_id))
    class_obj = class_result.scalar_one_or_none()
    if not class_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="班级不存在")

    await db.execute(delete(ClassStudent).where(ClassStudent.student_id == student_id))
    db.add(
        ClassStudent(
            class_id=class_obj.id,
            student_id=student_id,
            created_at=datetime.utcnow(),
        )
    )

    audit_log = AuditLog(
        actor_id=admin.id,
        action="set_student_class",
        target_type="student",
        target_id=student_id,
        meta={"class_id": class_obj.id},
        created_at=datetime.utcnow(),
    )
    db.add(audit_log)

    await db.commit()

    return StudentClassUpdateResponse(
        student_id=student_id,
        class_id=class_obj.id,
        class_name=class_obj.name,
    )


@router.delete("/users/{user_id}", response_model=DeleteUserResponse)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """删除用户（超管专用）"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")

    # 不允许删除管理员自己
    if user.id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="不能删除自己"
        )

    username = user.username

    # 记录审计日志
    audit_log = AuditLog(
        actor_id=admin.id,
        action="delete_user",
        target_type="user",
        target_id=user.id,
        meta={"username": username, "role": user.role.value},
        created_at=datetime.utcnow(),
    )
    db.add(audit_log)

    try:
        await db.execute(
            update(AuditLog)
            .where(AuditLog.actor_id == user.id)
            .values(actor_id=None)
        )
        await db.execute(delete(PromptScope).where(PromptScope.created_by == user.id))
        await db.execute(delete(ExportJob).where(ExportJob.requested_by == user.id))

        # 删除用户（会级联删除相关的班级关联、会话等）
        await db.delete(user)
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="用户仍有关联数据，无法删除",
        )

    return DeleteUserResponse(id=user_id, username=username, message="删除成功")


# ========================
# LLM 配置管理
# ========================

# 定义 LLM 配置的键名（统一使用 dotted keys）
LLM_CONFIG_KEYS = {
    "provider_name": "llm.provider",
    "base_url": "llm.base_url",
    "api_key": "llm.api_key",
    "model_name": "llm.model_name",
}

# 兼容旧的 underscore keys
LEGACY_LLM_CONFIG_KEYS = {
    "provider_name": "llm_provider_name",
    "base_url": "llm_base_url",
    "api_key": "llm_api_key",
    "model_name": "llm_model_name",
}


async def migrate_llm_config_keys(db: AsyncSession) -> None:
    """将旧的 underscore keys 迁移到新的 dotted keys（若新键不存在）。"""
    changed = False
    for field, dotted_key in LLM_CONFIG_KEYS.items():
        existing = await db.execute(
            select(SystemConfig).where(SystemConfig.key == dotted_key)
        )
        if existing.scalar_one_or_none():
            continue

        legacy_key = LEGACY_LLM_CONFIG_KEYS[field]
        legacy_result = await db.execute(
            select(SystemConfig).where(SystemConfig.key == legacy_key)
        )
        legacy_config = legacy_result.scalar_one_or_none()
        if legacy_config and legacy_config.value:
            db.add(SystemConfig(key=dotted_key, value=legacy_config.value))
            changed = True

    if changed:
        await db.commit()


def mask_api_key(api_key: str) -> str:
    """遮蔽 API Key，只显示前4位和后4位"""
    if not api_key:
        return ""
    if len(api_key) <= 8:
        return "*" * len(api_key)
    return api_key[:4] + "*" * (len(api_key) - 8) + api_key[-4:]


@router.get("/settings/llm", response_model=LLMConfigResponse)
async def get_llm_config(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """获取 LLM API 配置"""
    await migrate_llm_config_keys(db)
    config_values = {}
    for field, key in LLM_CONFIG_KEYS.items():
        result = await db.execute(select(SystemConfig).where(SystemConfig.key == key))
        config = result.scalar_one_or_none()
        if config:
            config_values[field] = config.value
            continue

        legacy_key = LEGACY_LLM_CONFIG_KEYS[field]
        legacy_result = await db.execute(
            select(SystemConfig).where(SystemConfig.key == legacy_key)
        )
        legacy_config = legacy_result.scalar_one_or_none()
        config_values[field] = legacy_config.value if legacy_config else ""

    api_key = config_values.get("api_key", "")

    return LLMConfigResponse(
        provider_name=config_values.get("provider_name", ""),
        base_url=config_values.get("base_url", ""),
        api_key_masked=mask_api_key(api_key),
        model_name=config_values.get("model_name", ""),
        has_api_key=bool(api_key),
    )


@router.put("/settings/llm", response_model=LLMConfigUpdateResponse)
async def update_llm_config(
    request: LLMConfigUpdateRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """更新 LLM API 配置"""
    from app.llm.runtime_settings import update_llm_runtime_settings

    await migrate_llm_config_keys(db)

    # 更新数据库中的配置
    updates = {}
    if request.provider_name is not None:
        updates["provider_name"] = request.provider_name
    if request.base_url is not None:
        updates["base_url"] = request.base_url
    if request.api_key is not None and request.api_key.strip():
        updates["api_key"] = request.api_key.strip()
    if request.model_name is not None:
        updates["model_name"] = request.model_name

    for field, value in updates.items():
        key = LLM_CONFIG_KEYS[field]
        result = await db.execute(select(SystemConfig).where(SystemConfig.key == key))
        config = result.scalar_one_or_none()
        if config:
            config.value = value
        else:
            db.add(SystemConfig(key=key, value=value))

        legacy_key = LEGACY_LLM_CONFIG_KEYS[field]
        legacy_result = await db.execute(
            select(SystemConfig).where(SystemConfig.key == legacy_key)
        )
        legacy_config = legacy_result.scalar_one_or_none()
        if legacy_config:
            legacy_config.value = value

    # 记录审计日志
    audit_log = AuditLog(
        actor_id=admin.id,
        action="update_llm_config",
        target_type="system_config",
        meta={
            "updated_fields": list(updates.keys()),
            # 不记录敏感信息如 api_key
        },
        created_at=datetime.utcnow(),
    )
    db.add(audit_log)

    await db.commit()

    # 更新运行时配置
    config_values = {}
    for field, key in LLM_CONFIG_KEYS.items():
        result = await db.execute(select(SystemConfig).where(SystemConfig.key == key))
        config = result.scalar_one_or_none()
        if config:
            config_values[field] = config.value
            continue

        legacy_key = LEGACY_LLM_CONFIG_KEYS[field]
        legacy_result = await db.execute(
            select(SystemConfig).where(SystemConfig.key == legacy_key)
        )
        legacy_config = legacy_result.scalar_one_or_none()
        config_values[field] = legacy_config.value if legacy_config else ""

    # 更新运行时 LLM 设置
    update_llm_runtime_settings(
        provider=config_values.get("provider_name") or None,
        base_url=config_values.get("base_url") or None,
        model_name=config_values.get("model_name") or None,
        api_key=config_values.get("api_key") or None,
    )

    api_key = config_values.get("api_key", "")

    return LLMConfigUpdateResponse(
        success=True,
        message="配置已更新",
        config=LLMConfigResponse(
            provider_name=config_values.get("provider_name", ""),
            base_url=config_values.get("base_url", ""),
            api_key_masked=mask_api_key(api_key),
            model_name=config_values.get("model_name", ""),
            has_api_key=bool(api_key),
        ),
    )


@router.post("/settings/llm/test", response_model=LLMTestResponse)
async def test_llm_connection(
    request: LLMTestRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """测试 LLM API 连接"""
    import httpx
    import time
    from app.config import get_settings

    settings = get_settings()

    # 如果请求中提供了参数则使用，否则从数据库或环境变量获取
    config_values = {}
    for field, key in LLM_CONFIG_KEYS.items():
        result = await db.execute(select(SystemConfig).where(SystemConfig.key == key))
        config = result.scalar_one_or_none()
        config_values[field] = config.value if config else ""

    base_url = request.base_url or config_values.get("base_url") or settings.openai_base_url
    api_key = request.api_key or config_values.get("api_key") or settings.openai_api_key
    model_name = request.model_name or config_values.get("model_name") or settings.model_name

    if not base_url:
        return LLMTestResponse(success=False, message="未配置 API 接口地址")
    if not api_key:
        return LLMTestResponse(success=False, message="未配置 API Key")
    if not model_name:
        return LLMTestResponse(success=False, message="未配置模型名称")

    # 测试连接
    try:
        start_time = time.time()

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{base_url.rstrip('/')}/chat/completions",
                json={
                    "model": model_name,
                    "messages": [{"role": "user", "content": "Hi"}],
                    "max_tokens": 5,
                },
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
            )

        latency_ms = int((time.time() - start_time) * 1000)

        if response.status_code == 200:
            return LLMTestResponse(
                success=True,
                message="连接成功",
                latency_ms=latency_ms,
                model=model_name,
            )
        else:
            error_detail = ""
            try:
                error_data = response.json()
                error_detail = error_data.get("error", {}).get("message", "") or str(error_data)
            except Exception:
                error_detail = response.text[:200] if response.text else ""

            return LLMTestResponse(
                success=False,
                message=f"API 返回错误 ({response.status_code}): {error_detail}",
                latency_ms=latency_ms,
            )

    except httpx.TimeoutException:
        return LLMTestResponse(success=False, message="连接超时，请检查网络或 API 地址")
    except httpx.ConnectError as e:
        return LLMTestResponse(success=False, message=f"连接失败: {str(e)}")
    except Exception as e:
        return LLMTestResponse(success=False, message=f"测试失败: {str(e)}")
