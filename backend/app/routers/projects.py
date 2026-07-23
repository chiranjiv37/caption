"""Projects router."""
from pathlib import Path
from typing import Optional
import uuid

from fastapi import (
    APIRouter,
    Depends,
    Query,
    status,
    UploadFile,
    File,
    Form,
    HTTPException,
)
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, get_current_user_bearer_or_query
from app.models.user import User
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectListResponse,
    ProjectDetailResponse,
    ProjectDuplicateRequest,
    ProjectMoveRequest,
    ProjectTranscribeResponse,
)
from app.schemas.job import JobStatusResponse
from app.schemas.common import PaginatedResponse, MessageResponse
from app.services.project_service import ProjectService
from app.services.job_service import JobService
from app.utils.time import format_duration

router = APIRouter(prefix="/projects", tags=["Projects"])

MEDIA_TYPES = {
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".mkv": "video/x-matroska",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".m4a": "audio/mp4",
    ".ogg": "audio/ogg",
}


def _media_type_for_path(path: Path) -> str:
    return MEDIA_TYPES.get(path.suffix.lower(), "application/octet-stream")


async def _to_project_list_item(
    project_service: ProjectService,
    project,
    langs: int | None = None,
) -> ProjectListResponse:
    if langs is None:
        counts = await project_service.count_languages_by_project([project.id])
        langs = counts.get(project.id, 0)
    item = ProjectListResponse.model_validate(project)
    item.langs = langs
    return item


async def _to_project_detail(
    project_service: ProjectService,
    project,
) -> ProjectDetailResponse:
    counts = await project_service.count_languages_by_project([project.id])
    detail = ProjectDetailResponse.model_validate(project)
    detail.langs = counts.get(project.id, 0)
    return detail


@router.get(
    "",
    response_model=PaginatedResponse[ProjectListResponse],
    summary="List projects",
)
async def list_projects(
    search: Optional[str] = Query(None, description="Search by name/description"),
    status: Optional[str] = Query(None, description="Filter by status"),
    favorite: Optional[bool] = Query(None, description="Filter by favorite"),
    archived: Optional[bool] = Query(None, description="Filter by archived"),
    sort_by: str = Query("updated_at", description="Sort field"),
    sort_order: str = Query("desc", description="Sort order (asc/desc)"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all projects for the current user with filtering."""
    project_service = ProjectService(db)
    projects, total = await project_service.list_projects(
        user_id=current_user.id,
        search=search,
        status=status,
        is_favorite=favorite,
        is_archived=archived,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        per_page=per_page,
    )

    total_pages = (total + per_page - 1) // per_page

    langs_map = await project_service.count_languages_by_project(
        [p.id for p in projects]
    )
    items = [
        await _to_project_list_item(
            project_service, p, langs=langs_map.get(p.id, 0)
        )
        for p in projects
    ]

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1,
    )


@router.post(
    "",
    response_model=ProjectDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create project",
)
async def create_project(
    name: str = Form(..., min_length=1, max_length=255),
    description: Optional[str] = Form(None),
    source_language: str = Form("en"),
    series_id: Optional[uuid.UUID] = Form(None),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new caption project and upload its media file."""
    file_data = await file.read()
    if not file_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty",
        )

    project_service = ProjectService(db)
    data = ProjectCreate(
        name=name,
        description=description,
        source_language=source_language,
        series_id=series_id,
    )
    project = await project_service.create_project(current_user.id, data)

    storage_key = project_service.save_project_file(
        project=project,
        file_data=file_data,
        original_filename=file.filename or "upload",
        content_type=file.content_type,
    )
    project.storage_key = storage_key
    await db.commit()
    await db.refresh(project)

    return await _to_project_detail(project_service, project)


@router.get(
    "/{project_id}",
    response_model=ProjectDetailResponse,
    summary="Get project",
)
async def get_project(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific project by ID."""
    project_service = ProjectService(db)
    project = await project_service.get_project(project_id, current_user.id)

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    return await _to_project_detail(project_service, project)


@router.put(
    "/{project_id}",
    response_model=ProjectDetailResponse,
    summary="Update project",
)
async def update_project(
    project_id: uuid.UUID,
    data: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a project."""
    project_service = ProjectService(db)
    project = await project_service.update_project(
        project_id, current_user.id, data
    )
    return await _to_project_detail(project_service, project)


@router.delete(
    "/{project_id}",
    response_model=MessageResponse,
    summary="Delete project",
)
async def delete_project(
    project_id: uuid.UUID,
    permanent: bool = Query(False, description="Permanently delete"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a project (soft delete by default)."""
    project_service = ProjectService(db)
    await project_service.delete_project(
        project_id, current_user.id, permanent=permanent
    )
    return MessageResponse(message="Project deleted successfully")


@router.post(
    "/{project_id}/favorite",
    response_model=ProjectDetailResponse,
    summary="Toggle favorite",
)
async def toggle_favorite(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Toggle favorite status for a project."""
    project_service = ProjectService(db)
    project = await project_service.toggle_favorite(project_id, current_user.id)
    return project


@router.post(
    "/{project_id}/archive",
    response_model=ProjectDetailResponse,
    summary="Toggle archive",
)
async def toggle_archive(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Toggle archive status for a project."""
    project_service = ProjectService(db)
    project = await project_service.toggle_archive(project_id, current_user.id)
    return project


@router.post(
    "/{project_id}/duplicate",
    response_model=ProjectDetailResponse,
    summary="Duplicate project",
)
async def duplicate_project(
    project_id: uuid.UUID,
    data: ProjectDuplicateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Duplicate a project."""
    project_service = ProjectService(db)
    project = await project_service.duplicate_project(
        project_id, current_user.id, data
    )
    return project


@router.post(
    "/{project_id}/move-to-series",
    response_model=ProjectDetailResponse,
    summary="Move to series",
)
async def move_to_series(
    project_id: uuid.UUID,
    data: ProjectMoveRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Move a project to a series."""
    project_service = ProjectService(db)
    project = await project_service.move_to_series(
        project_id, current_user.id, data
    )
    return project


@router.post(
    "/{project_id}/transcribe",
    response_model=ProjectTranscribeResponse,
    summary="Start transcription",
)
async def transcribe_project(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Start a transcription job for a project using its saved media file."""
    project_service = ProjectService(db)
    project = await project_service.get_project(project_id, current_user.id)

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    if project.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the project owner can start transcription",
        )

    if not project.storage_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project has no uploaded media file",
        )

    file_path = project_service.resolve_absolute_path(project.storage_key)
    if not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project media file not found on disk",
        )

    job_service = JobService(db)
    job_id = await job_service.create_transcription_job(
        project_id=project_id,
        file_path=str(file_path),
        language=project.source_language,
    )

    return ProjectTranscribeResponse(
        message="Transcription job is running.",
        project_id=project_id,
        storage_key=project.storage_key,
        job_id=job_id,
        job_status="uploading",
    )


@router.get(
    "/{project_id}/media",
    summary="Stream project media",
    responses={200: {"content": {"video/*": {}, "audio/*": {}}}},
)
async def get_project_media(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user_bearer_or_query),
    db: AsyncSession = Depends(get_db),
):
    """Stream the project's uploaded media file.

    Supports Authorization Bearer or ?token= for HTML5 video elements.
    FileResponse provides Accept-Ranges / Range seeking.
    """
    project_service = ProjectService(db)
    project = await project_service.get_project(project_id, current_user.id)

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    if not project.storage_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project has no media file",
        )

    file_path = project_service.resolve_absolute_path(project.storage_key)
    if not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project media file not found on disk",
        )

    return FileResponse(
        path=file_path,
        media_type=_media_type_for_path(file_path),
        filename=file_path.name,
        content_disposition_type="inline",
    )


@router.get(
    "/{project_id}/job-status",
    response_model=JobStatusResponse,
    summary="Get transcription job status",
)
async def get_job_status(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the current status of a project's transcription job."""
    project_service = ProjectService(db)
    project = await project_service.get_project(project_id, current_user.id)

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    return JobStatusResponse(
        job_id=project.job_id,
        status=project.job_status,
        progress=project.job_progress,
        message=project.job_message,
        result=project.transcription_result,
    )
