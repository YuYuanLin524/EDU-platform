from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from datetime import datetime
from typing import List
from app.db.base import get_db
from app.models import User, UserRole, Class, ClassStudent, ClassTeacher
from app.schemas.classes import (
    ClassCreate,
    ClassInfo,
    ClassListResponse,
    ClassDetail,
    StudentInClass,
    TeacherInClass,
    AddStudentsRequest,
    AddTeachersRequest,
)
from app.auth.deps import get_current_active_user, require_admin

router = APIRouter(prefix="/classes", tags=["班级管理"])


@router.post("", response_model=ClassInfo)
async def create_class(
    request: ClassCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """创建班级（超管专用）"""
    # 检查班级名是否已存在
    existing = await db.execute(select(Class).where(Class.name == request.name))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"班级 {request.name} 已存在",
        )

    class_obj = Class(
        name=request.name,
        grade=request.grade,
        created_at=datetime.utcnow(),
    )
    db.add(class_obj)
    await db.commit()
    await db.refresh(class_obj)

    return ClassInfo(
        id=class_obj.id,
        name=class_obj.name,
        grade=class_obj.grade,
        student_count=0,
        teacher_count=0,
        created_at=class_obj.created_at.isoformat() if class_obj.created_at else "",
    )


@router.get("", response_model=ClassListResponse)
async def list_classes(
    page: int = 1,
    page_size: int = 20,
    skip: int | None = None,
    limit: int | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """获取班级列表

    - 超管：返回所有班级
    - 教师：返回授课班级
    - 学生：返回所属班级
    """
    if current_user.role == UserRole.ADMIN:
        # 超管看所有班级
        query = select(Class)
        count_query = select(func.count(Class.id))
    elif current_user.role == UserRole.TEACHER:
        # 教师看授课班级
        query = (
            select(Class)
            .join(ClassTeacher, Class.id == ClassTeacher.class_id)
            .where(ClassTeacher.teacher_id == current_user.id)
        )
        count_query = (
            select(func.count(Class.id))
            .join(ClassTeacher, Class.id == ClassTeacher.class_id)
            .where(ClassTeacher.teacher_id == current_user.id)
        )
    else:
        # 学生看所属班级
        query = (
            select(Class)
            .join(ClassStudent, Class.id == ClassStudent.class_id)
            .where(ClassStudent.student_id == current_user.id)
        )
        count_query = (
            select(func.count(Class.id))
            .join(ClassStudent, Class.id == ClassStudent.class_id)
            .where(ClassStudent.student_id == current_user.id)
        )

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(Class.created_at.desc())
    if skip is not None or limit is not None:
        offset_value = int(skip or 0)
        limit_value = int(limit or page_size)
        query = query.offset(offset_value).limit(limit_value)
    else:
        query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    classes = result.scalars().all()

    # 获取每个班级的学生和教师数量
    items = []
    for c in classes:
        student_count_result = await db.execute(
            select(func.count(ClassStudent.student_id)).where(
                ClassStudent.class_id == c.id
            )
        )
        teacher_count_result = await db.execute(
            select(func.count(ClassTeacher.teacher_id)).where(
                ClassTeacher.class_id == c.id
            )
        )
        items.append(
            ClassInfo(
                id=c.id,
                name=c.name,
                grade=c.grade,
                student_count=student_count_result.scalar() or 0,
                teacher_count=teacher_count_result.scalar() or 0,
                created_at=c.created_at.isoformat() if c.created_at else "",
            )
        )

    return ClassListResponse(total=total, items=items)


@router.get("/{class_id}", response_model=ClassDetail)
async def get_class_detail(
    class_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """获取班级详情"""
    result = await db.execute(select(Class).where(Class.id == class_id))
    class_obj = result.scalar_one_or_none()

    if not class_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="班级不存在")

    # 权限检查
    if current_user.role == UserRole.TEACHER:
        teacher_check = await db.execute(
            select(ClassTeacher).where(
                ClassTeacher.class_id == class_id,
                ClassTeacher.teacher_id == current_user.id,
            )
        )
        if not teacher_check.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="无权查看该班级"
            )
    elif current_user.role == UserRole.STUDENT:
        student_check = await db.execute(
            select(ClassStudent).where(
                ClassStudent.class_id == class_id,
                ClassStudent.student_id == current_user.id,
            )
        )
        if not student_check.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="无权查看该班级"
            )

    # 获取学生列表
    students_result = await db.execute(
        select(User)
        .join(ClassStudent, User.id == ClassStudent.student_id)
        .where(ClassStudent.class_id == class_id)
    )
    students = [
        StudentInClass(
            id=s.id,
            username=s.username,
            display_name=s.display_name,
            last_login_at=s.last_login_at.isoformat() if s.last_login_at else None,
        )
        for s in students_result.scalars().all()
    ]

    # 获取教师列表
    teachers_result = await db.execute(
        select(User)
        .join(ClassTeacher, User.id == ClassTeacher.teacher_id)
        .where(ClassTeacher.class_id == class_id)
    )
    teachers = [
        TeacherInClass(
            id=t.id,
            username=t.username,
            display_name=t.display_name,
        )
        for t in teachers_result.scalars().all()
    ]

    return ClassDetail(
        id=class_obj.id,
        name=class_obj.name,
        grade=class_obj.grade,
        students=students,
        teachers=teachers,
        created_at=class_obj.created_at.isoformat() if class_obj.created_at else "",
    )


@router.post("/{class_id}/students/bulk-add")
async def add_students_to_class(
    class_id: int,
    request: AddStudentsRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """批量添加学生到班级（超管专用）"""
    result = await db.execute(select(Class).where(Class.id == class_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="班级不存在")

    added = 0
    errors = []

    other_class_result = await db.execute(
        select(ClassStudent.student_id, Class.name)
        .join(Class, Class.id == ClassStudent.class_id)
        .where(
            ClassStudent.student_id.in_(request.student_ids),
            ClassStudent.class_id != class_id,
        )
    )
    other_class_map: dict[int, list[str]] = {}
    for student_id, class_name in other_class_result.all():
        other_class_map.setdefault(student_id, []).append(class_name)

    for student_id in request.student_ids:
        # 检查用户是否存在且是学生
        user_result = await db.execute(select(User).where(User.id == student_id))
        user = user_result.scalar_one_or_none()
        if not user:
            errors.append(f"用户 {student_id} 不存在")
            continue
        if user.role != UserRole.STUDENT:
            errors.append(f"用户 {user.username} 不是学生角色")
            continue
        if student_id in other_class_map:
            class_name = other_class_map[student_id][0]
            errors.append(f"学生 {user.username} 已在班级 {class_name} 中，请先移除再添加")
            continue

        # 检查是否已在班级中
        existing = await db.execute(
            select(ClassStudent).where(
                ClassStudent.class_id == class_id,
                ClassStudent.student_id == student_id,
            )
        )
        if existing.scalar_one_or_none():
            errors.append(f"学生 {user.username} 已在该班级中")
            continue

        db.add(
            ClassStudent(
                class_id=class_id, student_id=student_id, created_at=datetime.utcnow()
            )
        )
        added += 1

    await db.commit()

    return {"added": added, "errors": errors}


@router.post("/{class_id}/teachers/add")
async def add_teachers_to_class(
    class_id: int,
    request: AddTeachersRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """添加教师到班级（超管专用）"""
    result = await db.execute(select(Class).where(Class.id == class_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="班级不存在")

    added = 0
    errors = []

    for teacher_id in request.teacher_ids:
        user_result = await db.execute(select(User).where(User.id == teacher_id))
        user = user_result.scalar_one_or_none()
        if not user:
            errors.append(f"用户 {teacher_id} 不存在")
            continue
        if user.role != UserRole.TEACHER:
            errors.append(f"用户 {user.username} 不是教师角色")
            continue

        existing = await db.execute(
            select(ClassTeacher).where(
                ClassTeacher.class_id == class_id,
                ClassTeacher.teacher_id == teacher_id,
            )
        )
        if existing.scalar_one_or_none():
            errors.append(f"教师 {user.username} 已在该班级中")
            continue

        db.add(
            ClassTeacher(
                class_id=class_id, teacher_id=teacher_id, created_at=datetime.utcnow()
            )
        )
        added += 1

    await db.commit()

    return {"added": added, "errors": errors}


@router.delete("/{class_id}/students/{student_id}")
async def remove_student_from_class(
    class_id: int,
    student_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """从班级移除学生（超管专用）"""
    result = await db.execute(select(Class).where(Class.id == class_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="班级不存在")

    # 检查学生是否在班级中
    existing = await db.execute(
        select(ClassStudent).where(
            ClassStudent.class_id == class_id,
            ClassStudent.student_id == student_id,
        )
    )
    class_student = existing.scalar_one_or_none()

    if not class_student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="该学生不在此班级中"
        )

    await db.delete(class_student)
    await db.commit()

    return {"message": "学生已从班级移除"}


@router.delete("/{class_id}/teachers/{teacher_id}")
async def remove_teacher_from_class(
    class_id: int,
    teacher_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """从班级移除教师（超管专用）"""
    result = await db.execute(select(Class).where(Class.id == class_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="班级不存在")

    # 检查教师是否在班级中
    existing = await db.execute(
        select(ClassTeacher).where(
            ClassTeacher.class_id == class_id,
            ClassTeacher.teacher_id == teacher_id,
        )
    )
    class_teacher = existing.scalar_one_or_none()

    if not class_teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="该教师不在此班级中"
        )

    await db.delete(class_teacher)
    await db.commit()

    return {"message": "教师已从班级移除"}
