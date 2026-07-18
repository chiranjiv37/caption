"""Segment schemas."""
import uuid
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, ConfigDict, Field


class SegmentTextBase(BaseModel):
    """Base segment text schema."""
    language_code: str = Field(..., min_length=2, max_length=10)
    text: str
    is_machine_translated: bool = False


class SegmentTextCreate(SegmentTextBase):
    """Schema for creating segment text."""
    pass


class SegmentTextUpdate(BaseModel):
    """Schema for updating segment text."""
    text: str


class SegmentTextResponse(SegmentTextBase):
    """Schema for segment text response."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    segment_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class SegmentBase(BaseModel):
    """Base segment schema."""
    start_time: float = Field(..., ge=0)
    end_time: float = Field(..., ge=0)


class SegmentCreate(SegmentBase):
    """Schema for creating a segment."""
    speaker_id: Optional[uuid.UUID] = None
    texts: Optional[List[SegmentTextCreate]] = None


class SegmentUpdate(BaseModel):
    """Schema for updating a segment."""
    start_time: Optional[float] = Field(None, ge=0)
    end_time: Optional[float] = Field(None, ge=0)
    speaker_id: Optional[uuid.UUID] = None


class SegmentResponse(SegmentBase):
    """Schema for segment response."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    speaker_id: Optional[uuid.UUID]
    sort_order: int
    created_at: datetime
    updated_at: datetime

    # Include texts for the current language
    text: Optional[str] = None
    texts: List[SegmentTextResponse] = []

    @property
    def duration(self) -> float:
        return self.end_time - self.start_time


class SegmentBatchUpdateItem(BaseModel):
    """Single segment update in a batch."""
    id: uuid.UUID
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    speaker_id: Optional[uuid.UUID] = None
    text: Optional[str] = None


class SegmentBatchUpdateRequest(BaseModel):
    """Request to update multiple segments."""
    segments: List[SegmentBatchUpdateItem]


class SegmentMergeRequest(BaseModel):
    """Request to merge segments."""
    segment_ids: List[uuid.UUID]


class SegmentSplitRequest(BaseModel):
    """Request to split a segment."""
    split_at: float = Field(..., ge=0, description="Timestamp in seconds to split at")
