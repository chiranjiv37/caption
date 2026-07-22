"""Project schemas."""
import uuid
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, ConfigDict, Field


class ProjectBase(BaseModel):
    """Base project schema."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None


class ProjectCreate(ProjectBase):
    """Schema for creating a new project."""
    source_language: str = "en"
    series_id: Optional[uuid.UUID] = None


class ProjectUpdate(BaseModel):
    """Schema for updating a project."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[str] = None
    is_favorite: Optional[bool] = None
    is_archived: Optional[bool] = None
    tile: Optional[int] = None


class ProjectListResponse(BaseModel):
    """Schema for project list item."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: Optional[str]
    initial: str
    tile: int
    duration_seconds: Optional[int]
    duration_display: Optional[str]
    status: str
    role: str
    source_language: str
    is_archived: bool
    is_favorite: bool
    is_deleted: bool
    owner_id: uuid.UUID
    series_id: Optional[uuid.UUID]
    created_at: datetime
    updated_at: datetime

    # Job tracking
    job_id: Optional[str] = None
    job_status: str = "pending"
    job_progress: int = 0
    job_message: Optional[str] = None

    # Computed fields
    langs: int = 1  # Number of languages (default 1 for now)


class ProjectDetailResponse(ProjectListResponse):
    """Schema for detailed project response."""
    storage_key: Optional[str]


class ProjectStats(BaseModel):
    """Project statistics."""
    total_segments: int
    total_speakers: int
    languages: List[str]


class ProjectWithStats(ProjectDetailResponse):
    """Project with statistics."""
    stats: ProjectStats


class ProjectDuplicateRequest(BaseModel):
    """Request to duplicate a project."""
    new_name: Optional[str] = None


class ProjectMoveRequest(BaseModel):
    """Request to move project to series."""
    series_id: Optional[uuid.UUID] = None


class ProjectTranscribeResponse(BaseModel):
    """Response for transcribe endpoint."""
    model_config = ConfigDict(from_attributes=True)

    message: str
    project_id: uuid.UUID
    storage_key: str
    job_id: str
    job_status: str
