"""Project service."""
import uuid
from typing import Optional, List

from fastapi import HTTPException, status
from sqlalchemy import select, func, and_, or_, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project, ProjectShare
from app.models.series import Series
from app.models.user import User
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectDuplicateRequest,
    ProjectMoveRequest,
)
from app.utils.time import format_duration


class ProjectService:
    """Service for project operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    def _get_initial_from_name(self, name: str) -> str:
        """Get initial letter from project name."""
        if name:
            return name[0].upper()
        return "P"

    async def create_project(self, user_id: uuid.UUID, data: ProjectCreate) -> Project:
        """Create a new project."""
        # Validate series if provided
        if data.series_id:
            series_result = await self.db.execute(
                select(Series).where(
                    and_(
                        Series.id == data.series_id,
                        Series.owner_id == user_id,
                    )
                )
            )
            if not series_result.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Series not found",
                )

        project = Project(
            name=data.name,
            description=data.description,
            initial=self._get_initial_from_name(data.name),
            source_language=data.source_language,
            owner_id=user_id,
            series_id=data.series_id,
        )

        self.db.add(project)
        await self.db.commit()
        await self.db.refresh(project)

        return project

    async def get_project(
        self,
        project_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Optional[Project]:
        """Get a project by ID with user access check."""
        result = await self.db.execute(
            select(Project).where(
                and_(
                    Project.id == project_id,
                    Project.is_deleted == False,
                    or_(
                        Project.owner_id == user_id,
                        Project.shares.any(ProjectShare.user_id == user_id),
                    ),
                )
            )
        )
        return result.scalar_one_or_none()

    async def list_projects(
        self,
        user_id: uuid.UUID,
        search: Optional[str] = None,
        status: Optional[str] = None,
        is_favorite: Optional[bool] = None,
        is_archived: Optional[bool] = None,
        sort_by: str = "updated_at",
        sort_order: str = "desc",
        page: int = 1,
        per_page: int = 20,
    ) -> tuple[List[Project], int]:
        """List projects with filtering and pagination."""
        # Base query
        query = select(Project).where(
            and_(
                Project.is_deleted == False,
                or_(
                    Project.owner_id == user_id,
                    Project.shares.any(ProjectShare.user_id == user_id),
                ),
            )
        )

        # Apply filters
        if status:
            query = query.where(Project.status == status)

        if is_favorite is not None:
            query = query.where(Project.is_favorite == is_favorite)

        if is_archived is not None:
            query = query.where(Project.is_archived == is_archived)
        else:
            # By default, exclude archived
            query = query.where(Project.is_archived == False)

        if search:
            search_filter = or_(
                Project.name.ilike(f"%{search}%"),
                Project.description.ilike(f"%{search}%"),
            )
            query = query.where(search_filter)

        # Get total count
        count_result = await self.db.execute(
            select(func.count()).select_from(query.subquery())
        )
        total = count_result.scalar()

        # Apply sorting
        sort_column = getattr(Project, sort_by, Project.updated_at)
        if sort_order == "desc":
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(asc(sort_column))

        # Apply pagination
        query = query.offset((page - 1) * per_page).limit(per_page)

        result = await self.db.execute(query)
        projects = result.scalars().all()

        return list(projects), total

    async def update_project(
        self,
        project_id: uuid.UUID,
        user_id: uuid.UUID,
        data: ProjectUpdate,
    ) -> Project:
        """Update a project."""
        project = await self.get_project(project_id, user_id)

        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found",
            )

        # Check permissions
        if project.owner_id != user_id:
            # Check if user has edit permission
            share_result = await self.db.execute(
                select(ProjectShare).where(
                    and_(
                        ProjectShare.project_id == project_id,
                        ProjectShare.user_id == user_id,
                        ProjectShare.role == "edit",
                    )
                )
            )
            if not share_result.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to edit this project",
                )

        # Update fields
        update_data = data.model_dump(exclude_unset=True)

        if "name" in update_data:
            update_data["initial"] = self._get_initial_from_name(update_data["name"])

        for field, value in update_data.items():
            setattr(project, field, value)

        await self.db.commit()
        await self.db.refresh(project)

        return project

    async def delete_project(
        self,
        project_id: uuid.UUID,
        user_id: uuid.UUID,
        permanent: bool = False,
    ) -> None:
        """Delete (soft or hard) a project."""
        project = await self.get_project(project_id, user_id)

        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found",
            )

        # Only owner can delete
        if project.owner_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only owner can delete a project",
            )

        if permanent:
            await self.db.delete(project)
        else:
            project.is_deleted = True

        await self.db.commit()

    async def toggle_favorite(
        self,
        project_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Project:
        """Toggle favorite status."""
        project = await self.get_project(project_id, user_id)

        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found",
            )

        project.is_favorite = not project.is_favorite
        await self.db.commit()
        await self.db.refresh(project)

        return project

    async def toggle_archive(
        self,
        project_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Project:
        """Toggle archive status."""
        project = await self.get_project(project_id, user_id)

        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found",
            )

        project.is_archived = not project.is_archived
        await self.db.commit()
        await self.db.refresh(project)

        return project

    async def duplicate_project(
        self,
        project_id: uuid.UUID,
        user_id: uuid.UUID,
        data: ProjectDuplicateRequest,
    ) -> Project:
        """Duplicate a project."""
        project = await self.get_project(project_id, user_id)

        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found",
            )

        # Create new project with same details
        new_name = data.new_name or f"{project.name} (Copy)"
        new_project = Project(
            name=new_name,
            description=project.description,
            initial=self._get_initial_from_name(new_name),
            tile=project.tile,
            duration_seconds=project.duration_seconds,
            duration_display=project.duration_display,
            source_language=project.source_language,
            owner_id=user_id,
            series_id=project.series_id,
        )

        self.db.add(new_project)
        await self.db.commit()
        await self.db.refresh(new_project)

        # TODO: Copy segments and speakers

        return new_project

    async def move_to_series(
        self,
        project_id: uuid.UUID,
        user_id: uuid.UUID,
        data: ProjectMoveRequest,
    ) -> Project:
        """Move project to a series."""
        project = await self.get_project(project_id, user_id)

        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found",
            )

        # Validate series if provided
        if data.series_id:
            series_result = await self.db.execute(
                select(Series).where(
                    and_(
                        Series.id == data.series_id,
                        Series.owner_id == user_id,
                    )
                )
            )
            if not series_result.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Series not found",
                )

        project.series_id = data.series_id
        await self.db.commit()
        await self.db.refresh(project)

        return project
