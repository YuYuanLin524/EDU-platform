from pydantic import BaseModel, Field
from typing import Optional, List
from app.models import ExportStatus


class ExportCreate(BaseModel):
    class_id: Optional[int] = None
    student_id: Optional[int] = None
    start_date: Optional[str] = None  # ISO format: 2026-01-01
    end_date: Optional[str] = None


class ExportJobInfo(BaseModel):
    id: int
    requested_by: int
    scope: dict
    status: ExportStatus
    file_key: Optional[str]
    error_message: Optional[str]
    created_at: str
    finished_at: Optional[str]

    class Config:
        from_attributes = True


class ExportListResponse(BaseModel):
    total: int
    items: List[ExportJobInfo]
