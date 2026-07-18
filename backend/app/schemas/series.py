"""Series schemas."""
import uuid
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, ConfigDict, Field


class SeriesSpeakerBase(BaseModel):
    """Base series speaker schema."""
    name: str = Field(..., min_length=1, max_length=255)
    meta: Optional[str] = None
    hue: int = 265


class SeriesSpeakerCreate(SeriesSpeakerBase):
    """Schema for creating a series speaker."""
    pass


class SeriesSpeakerResponse(SeriesSpeakerBase):
    """Schema for series speaker response."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    series_id: uuid.UUID
    created_at: datetime


class SeriesTermBase(BaseModel):
    """Base series term schema."""
    term: str = Field(..., min_length=1, max_length=255)
    rule: str


class SeriesTermCreate(SeriesTermBase):
    """Schema for creating a series term."""
    pass


class SeriesTermResponse(SeriesTermBase):
    """Schema for series term response."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    series_id: uuid.UUID
    created_at: datetime


class EpisodeBase(BaseModel):
    """Base episode schema."""
    title: str = Field(..., min_length=1, max_length=255)
    meta: Optional[str] = None


class EpisodeCreate(EpisodeBase):
    """Schema for creating an episode."""
    project_id: uuid.UUID


class EpisodeResponse(EpisodeBase):
    """Schema for episode response."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    series_id: uuid.UUID
    project_id: uuid.UUID
    status: str
    sort_order: int
    created_at: datetime


class SeriesBase(BaseModel):
    """Base series schema."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    hue: int = 265


class SeriesCreate(SeriesBase):
    """Schema for creating a new series."""
    languages: List[str] = []


class SeriesUpdate(BaseModel):
    """Schema for updating a series."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    hue: Optional[int] = None
    is_archived: Optional[bool] = None


class SeriesListResponse(BaseModel):
    """Schema for series list item."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: Optional[str]
    hue: int
    is_archived: bool
    is_deleted: bool
    owner_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    # Computed fields
    episode_count: int = 0
    languages: List[str] = []


class SeriesDetailResponse(SeriesListResponse):
    """Schema for detailed series response."""
    speakers: List[SeriesSpeakerResponse]
    terms: List[SeriesTermResponse]
    episodes: List[EpisodeResponse]
    languages: List[str]


class SeriesReorderRequest(BaseModel):
    """Request to reorder episodes."""
    episode_ids: List[uuid.UUID]


class LanguageResponse(BaseModel):
    """Language response schema."""
    code: str
    name: str
    native_name: Optional[str]
