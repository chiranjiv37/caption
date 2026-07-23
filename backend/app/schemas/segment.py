"""Segment schemas."""
import uuid
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, ConfigDict, Field


class SegmentBase(BaseModel):
    """Base segment schema."""
    start_time: float = Field(..., ge=0)
    end_time: float = Field(..., ge=0)
    text: str = ""


class SegmentCreate(SegmentBase):
    """Schema for creating a segment."""
    transcript_id: Optional[uuid.UUID] = None
    speaker_id: Optional[uuid.UUID] = None
    source_segment_id: Optional[uuid.UUID] = None
    sort_order: int = 0
    confidence: Optional[float] = None


class SegmentUpdate(BaseModel):
    """Schema for updating a segment."""
    start_time: Optional[float] = Field(None, ge=0)
    end_time: Optional[float] = Field(None, ge=0)
    speaker_id: Optional[uuid.UUID] = None
    text: Optional[str] = None
    sort_order: Optional[int] = None
    confidence: Optional[float] = None


class SegmentResponse(SegmentBase):
    """Schema for segment response."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    transcript_id: uuid.UUID
    source_segment_id: Optional[uuid.UUID] = None
    speaker_id: Optional[uuid.UUID] = None
    sort_order: int
    confidence: Optional[float] = None
    created_at: datetime
    updated_at: datetime

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
    sort_order: Optional[int] = None


class SegmentBatchUpdateRequest(BaseModel):
    """Request to update multiple segments."""
    segments: List[SegmentBatchUpdateItem]


class SegmentMergeRequest(BaseModel):
    """Request to merge segments."""
    segment_ids: List[uuid.UUID]


class SegmentSplitRequest(BaseModel):
    """Request to split a segment."""
    split_at: float = Field(..., ge=0, description="Timestamp in seconds to split at")
