"""Projects router."""
from typing import Optional
import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectListResponse,
    ProjectDetailResponse,
    ProjectDuplicateRequest,
    ProjectMoveRequest,
)
from app.schemas.common import PaginatedResponse, MessageResponse
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.get(
    "/",
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

    return PaginatedResponse(
        items=projects,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1,
    )


@router.post(
    "/",
    response_model=ProjectDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create project",
)
async def create_project(
    data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new caption project."""
    project_service = ProjectService(db)
    project = await project_service.create_project(current_user.id, data)
    return project


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

    return project


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
    return project


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


# Import HTTPException here to avoid circular imports
from fastapi import HTTPException
