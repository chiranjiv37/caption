"""Common schemas and paginated response."""
from typing import Generic, List, TypeVar, Optional

from pydantic import BaseModel

T = TypeVar("T")


class PaginationParams(BaseModel):
    """Common pagination parameters."""
    page: int = 1
    per_page: int = 20


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response."""
    items: List[T]
    total: int
    page: int
    per_page: int
    total_pages: int
    has_next: bool
    has_prev: bool


class MessageResponse(BaseModel):
    """Simple message response."""
    message: str


class ErrorResponse(BaseModel):
    """Error response schema."""
    error: str
    detail: Optional[str] = None
    code: Optional[str] = None
