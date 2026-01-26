from pydantic import BaseModel, Field
from typing import Optional, List


class ClassCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    grade: Optional[str] = Field(None, max_length=50)


class ClassInfo(BaseModel):
    id: int
    name: str
    grade: Optional[str]
    student_count: int = 0
    teacher_count: int = 0
    created_at: str

    class Config:
        from_attributes = True


class ClassListResponse(BaseModel):
    total: int
    items: List[ClassInfo]


class StudentInClass(BaseModel):
    id: int
    username: str
    display_name: Optional[str]
    last_login_at: Optional[str]

    class Config:
        from_attributes = True


class TeacherInClass(BaseModel):
    id: int
    username: str
    display_name: Optional[str]

    class Config:
        from_attributes = True


class ClassDetail(BaseModel):
    id: int
    name: str
    grade: Optional[str]
    students: List[StudentInClass]
    teachers: List[TeacherInClass]
    created_at: str


class AddStudentsRequest(BaseModel):
    student_ids: List[int] = Field(..., min_items=1)


class AddTeachersRequest(BaseModel):
    teacher_ids: List[int] = Field(..., min_items=1)
