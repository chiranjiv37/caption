"""Transcript schemas."""
import uuid
from datetime import datetime
from typing import Optional, Literal

from pydantic import BaseModel, ConfigDict, Field


class TranscriptCreate(BaseModel):
    """Schema for creating a transcript."""
    language_code: str = Field(..., min_length=2, max_length=10)
    type: Literal["original", "translation"] = "original"
    parent_transcript_id: Optional[uuid.UUID] = None
    status: str = "draft"
    version: int = 1


class TranscriptUpdate(BaseModel):
    """Schema for updating a transcript."""
    status: Optional[str] = None
    version: Optional[int] = None


class TranscriptResponse(BaseModel):
    """Schema for transcript response."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    language_code: str
    type: str
    parent_transcript_id: Optional[uuid.UUID] = None
    status: str
    version: int
    created_at: datetime
    updated_at: datetime
