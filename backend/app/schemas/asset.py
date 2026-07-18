"""Asset schemas."""
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class AssetBase(BaseModel):
    """Base asset schema."""
    name: str = Field(..., min_length=1, max_length=255)
    path: str = ""


class AssetCreate(AssetBase):
    """Schema for creating an asset."""
    storage_key: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    kind: Optional[str] = None


class AssetUpdate(BaseModel):
    """Schema for updating an asset."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    path: Optional[str] = None
    is_flagged: Optional[bool] = None


class AssetResponse(AssetBase):
    """Schema for asset response."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    owner_id: uuid.UUID
    storage_key: str
    file_size: Optional[int]
    mime_type: Optional[str]
    kind: Optional[str]
    duration_seconds: Optional[int]
    is_flagged: bool
    created_at: datetime

    @property
    def full_path(self) -> str:
        if self.path:
            return f"{self.path}/{self.name}"
        return self.name


class AssetUploadResponse(BaseModel):
    """Response for asset upload."""
    asset: AssetResponse
    upload_url: Optional[str] = None  # Presigned URL for direct S3 upload


class AssetFolderCreate(BaseModel):
    """Schema for creating a folder."""
    name: str = Field(..., min_length=1, max_length=255)
    path: str = ""


class PresignedUrlRequest(BaseModel):
    """Request for presigned URL."""
    filename: str
    content_type: str
    path: str = ""


class PresignedUrlResponse(BaseModel):
    """Response with presigned URL."""
    url: str
    fields: Optional[dict] = None
    asset_id: uuid.UUID
    storage_key: str
