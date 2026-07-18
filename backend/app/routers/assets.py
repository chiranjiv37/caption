"""Assets router."""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query, status, UploadFile, File
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.asset import Asset
from app.models.user import User
from app.schemas.asset import (
    AssetResponse,
    AssetUpdate,
    AssetFolderCreate,
    PresignedUrlRequest,
    PresignedUrlResponse,
)
from app.schemas.common import MessageResponse
from app.services.storage_service import StorageService

router = APIRouter(prefix="/assets", tags=["Assets"])


@router.get(
    "/",
    response_model=list[AssetResponse],
    summary="List assets",
)
async def list_assets(
    path: Optional[str] = Query(None, description="Filter by folder path"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all assets for the current user."""
    query = select(Asset).where(Asset.owner_id == current_user.id)

    if path is not None:
        query = query.where(Asset.path == path)

    result = await db.execute(query.order_by(Asset.created_at.desc()))
    assets = result.scalars().all()
    return assets


@router.post(
    "/presigned-url",
    response_model=PresignedUrlResponse,
    summary="Get presigned upload URL",
)
async def get_presigned_url(
    data: PresignedUrlRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate a presigned URL for direct S3 upload."""
    storage_service = StorageService()

    # Create asset record first
    asset = Asset(
        owner_id=current_user.id,
        name=data.filename,
        path=data.path,
        storage_key="",  # Will be updated after upload
        mime_type=data.content_type,
        kind=_get_kind_from_content_type(data.content_type),
    )
    db.add(asset)
    await db.commit()
    await db.refresh(asset)

    # Generate presigned URL
    upload_data = await storage_service.generate_presigned_upload_url(
        user_id=current_user.id,
        filename=data.filename,
        content_type=data.content_type,
        path=data.path,
    )

    # Update asset with storage key
    asset.storage_key = upload_data["storage_key"]
    await db.commit()

    return PresignedUrlResponse(
        url=upload_data["url"],
        fields=upload_data["fields"],
        asset_id=asset.id,
        storage_key=upload_data["storage_key"],
    )


@router.post(
    "/upload",
    response_model=AssetResponse,
    summary="Upload file",
)
async def upload_file(
    file: UploadFile = File(...),
    path: str = "",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a file directly."""
    storage_service = StorageService()

    # Read file content
    content = await file.read()

    # Upload to S3
    storage_key = await storage_service.upload_file(
        file_data=content,
        user_id=current_user.id,
        filename=file.filename,
        content_type=file.content_type or "application/octet-stream",
        path=path,
    )

    # Create asset record
    asset = Asset(
        owner_id=current_user.id,
        name=file.filename,
        path=path,
        storage_key=storage_key,
        file_size=len(content),
        mime_type=file.content_type,
        kind=_get_kind_from_content_type(file.content_type),
    )

    db.add(asset)
    await db.commit()
    await db.refresh(asset)

    return asset


@router.get(
    "/{asset_id}",
    response_model=AssetResponse,
    summary="Get asset",
)
async def get_asset(
    asset_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific asset."""
    result = await db.execute(
        select(Asset).where(
            and_(
                Asset.id == asset_id,
                Asset.owner_id == current_user.id,
            )
        )
    )
    asset = result.scalar_one_or_none()

    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found",
        )

    return asset


@router.put(
    "/{asset_id}",
    response_model=AssetResponse,
    summary="Update asset",
)
async def update_asset(
    asset_id: uuid.UUID,
    data: AssetUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update asset metadata."""
    result = await db.execute(
        select(Asset).where(
            and_(
                Asset.id == asset_id,
                Asset.owner_id == current_user.id,
            )
        )
    )
    asset = result.scalar_one_or_none()

    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found",
        )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(asset, field, value)

    await db.commit()
    await db.refresh(asset)
    return asset


@router.delete(
    "/{asset_id}",
    response_model=MessageResponse,
    summary="Delete asset",
)
async def delete_asset(
    asset_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete an asset."""
    result = await db.execute(
        select(Asset).where(
            and_(
                Asset.id == asset_id,
                Asset.owner_id == current_user.id,
            )
        )
    )
    asset = result.scalar_one_or_none()

    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found",
        )

    # Delete from S3
    storage_service = StorageService()
    await storage_service.delete_file(asset.storage_key)

    # Delete from database
    await db.delete(asset)
    await db.commit()

    return MessageResponse(message="Asset deleted successfully")


@router.get(
    "/{asset_id}/download",
    response_model=dict,
    summary="Get download URL",
)
async def get_download_url(
    asset_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a presigned download URL for an asset."""
    result = await db.execute(
        select(Asset).where(
            and_(
                Asset.id == asset_id,
                Asset.owner_id == current_user.id,
            )
        )
    )
    asset = result.scalar_one_or_none()

    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found",
        )

    storage_service = StorageService()
    url = await storage_service.generate_presigned_download_url(
        storage_key=asset.storage_key,
        filename=asset.name,
    )

    return {"download_url": url}


@router.post(
    "/folders",
    response_model=MessageResponse,
    summary="Create folder",
)
async def create_folder(
    data: AssetFolderCreate,
    current_user: User = Depends(get_current_user),
):
    """Create a new folder (placeholder - folders are virtual)."""
    # Folders are virtual in S3 - just validate the path
    return MessageResponse(message=f"Folder '{data.name}' created in '{data.path}'")


def _get_kind_from_content_type(content_type: Optional[str]) -> Optional[str]:
    """Determine asset kind from content type."""
    if not content_type:
        return None

    if content_type.startswith("video/"):
        return "video"
    elif content_type.startswith("audio/"):
        return "audio"
    elif content_type == "text/srt" or content_type == "application/x-subrip":
        return "srt"
    elif content_type == "text/vtt":
        return "vtt"
    elif content_type.startswith("text/"):
        return "text"
    else:
        return "other"


# Import HTTPException
from fastapi import HTTPException
