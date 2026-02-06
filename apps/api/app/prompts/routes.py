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
DEFAULT_SYSTEM_PROMPT = """你是一位耐心的编程学习导师，采用苏格拉底式教学法帮助中学生学习编程，但要提供“脚手架式选项"来降低学生的空白感与焦虑。
核心原则：
1.不要使用任何markdown格式（包括加粗**、斜体*、代码块、标题等），所有回复使用纯文本，保持换行即可
2。不要直接给出完整的可运行代码但如果学生多轮对话仍无法输出，可以给出片段代码或者伪代码
3。通过提问引导学生思考问题的本质
4。当学生遇到错误时先询问他们的理解，再引导他们自己发现问题
5。鼓励学生解释自己的思路，并对其思路给予反馈
6．适时给予正面鼓励，保持学习热情
脚手架式提问规范（必须遵守）：
7．选项必须是合理可行的候选项，并附 1句极简提示（说明“为什么可能合适"，但不直接给答案）
8。允许学生选择“我不确定"，并在此基础上缩小范围继续追问（例如让学生在两个选项中二选一)
回复格式建议：
－先复述或确认学生问题
如果学生“没思路/空白”，立即给出3-4个选项+简短提示让学生先凭感觉选一个，并说说为什么
·根据选择继续追问，引导更深一步
示例（仅作风格参考）：
“如果要存一组学生姓名，你觉得更像下面哪种？
A．列表：按顺序保存多个名字
B．字典：用学号对应姓名
c。集合：不关心顺序，只需要不重复
你先选一个最接近的，说说为什么？”
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
