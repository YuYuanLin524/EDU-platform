from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime
from typing import Optional
from app.db.base import get_db
from app.models import (
    User,
    UserRole,
    PromptScope,
    ScopeType,
    Class,
    ClassTeacher,
    AuditLog,
)
from app.schemas.prompts import (
    PromptCreate,
    PromptInfo,
    PromptListResponse,
    EffectivePrompt,
)
from app.auth.deps import get_current_active_user, require_teacher

router = APIRouter(prefix="/prompts", tags=["提示词管理"])


# 默认系统提示词（平台固定，不可更改）
DEFAULT_SYSTEM_PROMPT = """你是一位中学生编程导师，采用苏格拉底式教学法，但要优先降低学生的空白感。
你的目标是先给方向和骨架，再通过提问帮助学生理解。

硬性规则：
1. 回复只能使用纯文本，不使用任何 markdown 标记。
2. 默认教学语言是 Python，除非学生明确要求其他语言。
3. 不直接给完整最终答案，但必须给可执行的半成品填空框架。
4. 每次回复最多提出 1-2 个关键问题，避免连续追问造成挫败感。
5. 如果同一任务连续 2 轮没有进展，立即切换为更具体的填空引导。
6. 如果学生明确说没思路或要求先给框架，直接进入填空模式。
7. 发现学生报错时，先指出可能出错的位置，再引导修复。

回复流程（必须遵守）：
第一步：用 1-2 句话确认学生要完成的任务。
第二步：给一个 Python 填空框架（4-12 行，保留 2-4 个空）。
第三步：逐条解释每个空位的作用和思路。
第四步：只让学生先填 1 个空，再继续下一步。

填空框架格式要求：
- 空位统一写成 ____1____、____2____ 这种形式。
- 框架要包含完整结构线索，例如初始化、循环、条件、输出。
- 不要一次讲完所有细节，要先让学生完成当前一步。

示例风格（仅作风格参考）：
任务：计算 1 到 100 的和
框架：
total = ____1____
for i in range(____2____, ____3____):
    total += ____4____
print(total)
解释：
____1____ 是累加器初值；____2____ 和 ____3____ 决定循环范围。
下一步：
你先填写 ____1____，并说说为什么这样填。
"""


def _prompt_to_info(
    p: PromptScope, class_name: str = None, creator_name: str = None
) -> PromptInfo:
    return PromptInfo(
        id=p.id,
        scope_type=p.scope_type,
        class_id=p.class_id,
        class_name=class_name,
        content=p.content,
        version=p.version,
        is_active=p.is_active,
        created_by=p.created_by,
        creator_name=creator_name,
        created_at=p.created_at.isoformat() if p.created_at else "",
    )


@router.post("", response_model=PromptInfo)
async def create_prompt(
    request: PromptCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    """创建新的提示词配置

    - 超管可创建全局提示词
    - 教师只能创建所授课班级的提示词
    """
    # 权限检查
    if request.scope_type == ScopeType.GLOBAL:
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="只有超管可以创建全局提示词",
            )
    elif request.scope_type == ScopeType.CLASS:
        if not request.class_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="班级提示词必须指定 class_id",
            )
        # 教师权限检查
        if current_user.role == UserRole.TEACHER:
            teacher_check = await db.execute(
                select(ClassTeacher).where(
                    ClassTeacher.class_id == request.class_id,
                    ClassTeacher.teacher_id == current_user.id,
                )
            )
            if not teacher_check.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="无权为该班级配置提示词",
                )

    # 计算新版本号
    version_query = select(func.max(PromptScope.version)).where(
        PromptScope.scope_type == request.scope_type,
        PromptScope.class_id == request.class_id,
    )
    result = await db.execute(version_query)
    max_version = result.scalar() or 0
    new_version = max_version + 1

    # 如果 auto_activate，先将同作用域的其他版本设为非激活
    if request.auto_activate:
        await db.execute(
            select(PromptScope).where(
                PromptScope.scope_type == request.scope_type,
                PromptScope.class_id == request.class_id,
                PromptScope.is_active == True,
            )
        )
        # 直接用 update 更高效
        from sqlalchemy import update

        await db.execute(
            update(PromptScope)
            .where(
                PromptScope.scope_type == request.scope_type,
                PromptScope.class_id == request.class_id,
                PromptScope.is_active == True,
            )
            .values(is_active=False)
        )

    # 创建新提示词
    prompt = PromptScope(
        scope_type=request.scope_type,
        class_id=request.class_id,
        content=request.content,
        version=new_version,
        is_active=request.auto_activate,
        created_by=current_user.id,
        created_at=datetime.utcnow(),
    )
    db.add(prompt)

    # 审计日志
    audit_log = AuditLog(
        actor_id=current_user.id,
        action="prompt_create",
        target_type="prompt",
        meta={
            "scope_type": request.scope_type.value,
            "class_id": request.class_id,
            "version": new_version,
        },
        created_at=datetime.utcnow(),
    )
    db.add(audit_log)

    await db.commit()
    await db.refresh(prompt)

    return _prompt_to_info(prompt)


@router.post("/{prompt_id}/activate")
async def activate_prompt(
    prompt_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    """激活指定版本的提示词（用于回滚）"""
    result = await db.execute(select(PromptScope).where(PromptScope.id == prompt_id))
    prompt = result.scalar_one_or_none()

    if not prompt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="提示词不存在"
        )

    # 权限检查
    if prompt.scope_type == ScopeType.GLOBAL and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="只有超管可以激活全局提示词"
        )
    if prompt.scope_type == ScopeType.CLASS and current_user.role == UserRole.TEACHER:
        teacher_check = await db.execute(
            select(ClassTeacher).where(
                ClassTeacher.class_id == prompt.class_id,
                ClassTeacher.teacher_id == current_user.id,
            )
        )
        if not teacher_check.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="无权操作该班级的提示词"
            )

    # 先将同作用域的其他版本设为非激活
    from sqlalchemy import update

    await db.execute(
        update(PromptScope)
        .where(
            PromptScope.scope_type == prompt.scope_type,
            PromptScope.class_id == prompt.class_id,
            PromptScope.is_active == True,
        )
        .values(is_active=False)
    )

    # 激活当前版本
    prompt.is_active = True

    # 审计日志
    audit_log = AuditLog(
        actor_id=current_user.id,
        action="prompt_activate",
        target_type="prompt",
        target_id=prompt_id,
        meta={"version": prompt.version},
        created_at=datetime.utcnow(),
    )
    db.add(audit_log)

    await db.commit()

    return {"message": "提示词已激活", "version": prompt.version}


@router.get("/effective", response_model=EffectivePrompt)
async def get_effective_prompt(
    class_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """获取指定班级的有效提示词（合并全局+班级配置）"""
    # 获取全局激活的提示词
    global_result = await db.execute(
        select(PromptScope).where(
            PromptScope.scope_type == ScopeType.GLOBAL,
            PromptScope.is_active == True,
        )
    )
    global_prompt = global_result.scalar_one_or_none()

    # 获取班级激活的提示词
    class_result = await db.execute(
        select(PromptScope).where(
            PromptScope.scope_type == ScopeType.CLASS,
            PromptScope.class_id == class_id,
            PromptScope.is_active == True,
        )
    )
    class_prompt = class_result.scalar_one_or_none()

    # 合并提示词：系统默认 + 全局 + 班级
    merged_parts = [DEFAULT_SYSTEM_PROMPT]
    version = 0

    global_info = None
    class_info = None

    if global_prompt:
        merged_parts.append(f"\n\n【全局配置】\n{global_prompt.content}")
        version = global_prompt.version
        global_info = _prompt_to_info(global_prompt)

    if class_prompt:
        merged_parts.append(f"\n\n【班级配置】\n{class_prompt.content}")
        version = class_prompt.version  # 班级配置优先级更高
        class_info = _prompt_to_info(class_prompt)

    return EffectivePrompt(
        global_prompt=global_info,
        class_prompt=class_info,
        merged_content="".join(merged_parts),
        version=version,
    )


@router.get("/history", response_model=PromptListResponse)
async def get_prompt_history(
    scope_type: ScopeType = ScopeType.GLOBAL,
    class_id: Optional[int] = None,
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    """获取提示词历史版本"""
    query = select(PromptScope).where(PromptScope.scope_type == scope_type)
    count_query = select(func.count(PromptScope.id)).where(
        PromptScope.scope_type == scope_type
    )

    if scope_type == ScopeType.CLASS:
        if not class_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="查询班级提示词必须指定 class_id",
            )
        query = query.where(PromptScope.class_id == class_id)
        count_query = count_query.where(PromptScope.class_id == class_id)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(PromptScope.version.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    prompts = result.scalars().all()

    items = [_prompt_to_info(p) for p in prompts]

    return PromptListResponse(total=total, items=items)
