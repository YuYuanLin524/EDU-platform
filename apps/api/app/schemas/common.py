from pydantic import BaseModel
from typing import Generic, TypeVar, List

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """通用分页响应"""
    total: int
    items: List[T]
    skip: int = 0
    limit: int = 50
