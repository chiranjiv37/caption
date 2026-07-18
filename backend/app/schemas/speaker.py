"""Speaker schemas."""
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class SpeakerBase(BaseModel):
    """Base speaker schema."""
    name: str = Field(..., min_length=1, max_length=255)
    hue: int = 265


class SpeakerCreate(SpeakerBase):
    """Schema for creating a speaker."""
    pass


class SpeakerUpdate(BaseModel):
    """Schema for updating a speaker."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    hue: Optional[int] = None


class SpeakerResponse(SpeakerBase):
    """Schema for speaker response."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    created_at: datetime

    # Computed field
    segment_count: int = 0


class SpeakerMergeRequest(BaseModel):
    """Request to merge speakers."""
    target_speaker_id: uuid.UUID
