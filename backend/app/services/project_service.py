"""Project service."""
import uuid
from pathlib import Path
from typing import Optional, List

from fastapi import HTTPException, status
from sqlalchemy import select, func, and_, or_, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
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

    def _resolve_file_extension(
        self,
        original_filename: str,
        content_type: Optional[str] = None,
    ) -> str:
        """Determine file extension from filename or content type."""
        file_extension = Path(original_filename).suffix
        if file_extension:
            return file_extension

        content_type = content_type or ""
        if "mp4" in content_type:
            return ".mp4"
        if "mp3" in content_type:
            return ".mp3"
        if "wav" in content_type:
            return ".wav"
        return ".bin"

    def save_project_file(
        self,
        project: Project,
        file_data: bytes,
        original_filename: str,
        content_type: Optional[str] = None,
    ) -> str:
        """Save uploaded file to disk and return relative storage_key.

        Writes to {storage_location}/{project_id}/{uuid}{ext} and returns
        the relative path {project_id}/{filename}.
        """
        settings = get_settings()
        project_folder = Path(settings.storage_location) / str(project.id)
        project_folder.mkdir(parents=True, exist_ok=True)

        file_extension = self._resolve_file_extension(
            original_filename, content_type
        )
        file_name = f"{uuid.uuid4()}{file_extension}"
        file_path = project_folder / file_name

        with open(file_path, "wb") as f:
            f.write(file_data)

        return str(Path(str(project.id)) / file_name)

    def resolve_absolute_path(self, storage_key: str) -> Path:
        """Resolve absolute filesystem path from a relative storage_key."""
        settings = get_settings()
        return Path(settings.storage_location) / storage_key

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

    async def require_project_access(
        self,
        project_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Project:
        """Return project or raise 404 if user has no access."""
        project = await self.get_project(project_id, user_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found",
            )
        return project

    async def require_project_edit(
        self,
        project_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Project:
        """Return project if user can edit; raise 404/403 otherwise."""
        project = await self.require_project_access(project_id, user_id)

        if project.owner_id == user_id:
            return project

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
        return project

    async def count_languages_by_project(
        self,
        project_ids: List[uuid.UUID],
    ) -> dict[uuid.UUID, int]:
        """Count distinct transcript language codes per project."""
        if not project_ids:
            return {}

        from app.models.transcript import Transcript

        result = await self.db.execute(
            select(
                Transcript.project_id,
                func.count(func.distinct(Transcript.language_code)),
            )
            .where(Transcript.project_id.in_(project_ids))
            .group_by(Transcript.project_id)
        )
        return {row[0]: int(row[1]) for row in result.all()}

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
        """Duplicate a project including speakers, transcripts, and segments."""
        from app.models.segment import Segment
        from app.models.speaker import Speaker
        from app.models.transcript import Transcript

        project = await self.get_project(project_id, user_id)

        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found",
            )

        # Create new project with same details (reset job state)
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
            storage_key=None,
            audio_path=None,
            thumbnail_path=None,
            status=project.status,
            job_status="pending",
            job_progress=0,
            job_id=None,
            job_message=None,
            transcription_result=None,
        )

        self.db.add(new_project)
        await self.db.flush()

        # Copy speakers (old id -> new id)
        speaker_result = await self.db.execute(
            select(Speaker).where(Speaker.project_id == project_id)
        )
        speakers = list(speaker_result.scalars().all())
        speaker_id_map: dict[uuid.UUID, uuid.UUID] = {}
        for speaker in speakers:
            new_speaker = Speaker(
                project_id=new_project.id,
                name=speaker.name,
                hue=speaker.hue,
                voice_clone_id=speaker.voice_clone_id,
            )
            self.db.add(new_speaker)
            await self.db.flush()
            speaker_id_map[speaker.id] = new_speaker.id

        # Copy transcripts (two-pass for parent links)
        transcript_result = await self.db.execute(
            select(Transcript)
            .where(Transcript.project_id == project_id)
            .order_by(Transcript.created_at.asc())
        )
        transcripts = list(transcript_result.scalars().all())
        transcript_id_map: dict[uuid.UUID, uuid.UUID] = {}

        for transcript in transcripts:
            new_transcript = Transcript(
                project_id=new_project.id,
                language_code=transcript.language_code,
                type=transcript.type,
                parent_transcript_id=None,
                status=transcript.status,
                version=transcript.version,
            )
            self.db.add(new_transcript)
            await self.db.flush()
            transcript_id_map[transcript.id] = new_transcript.id

        for transcript in transcripts:
            if transcript.parent_transcript_id:
                child = await self.db.get(
                    Transcript, transcript_id_map[transcript.id]
                )
                parent_new_id = transcript_id_map.get(transcript.parent_transcript_id)
                if child and parent_new_id:
                    child.parent_transcript_id = parent_new_id

        await self.db.flush()

        # Copy segments (two-pass for source_segment_id)
        segment_result = await self.db.execute(
            select(Segment)
            .join(Transcript, Segment.transcript_id == Transcript.id)
            .where(Transcript.project_id == project_id)
            .order_by(Segment.sort_order.asc())
        )
        segments = list(segment_result.scalars().all())
        segment_id_map: dict[uuid.UUID, uuid.UUID] = {}

        for segment in segments:
            new_transcript_id = transcript_id_map.get(segment.transcript_id)
            if not new_transcript_id:
                continue
            new_speaker_id = (
                speaker_id_map.get(segment.speaker_id)
                if segment.speaker_id
                else None
            )
            new_segment = Segment(
                transcript_id=new_transcript_id,
                speaker_id=new_speaker_id,
                source_segment_id=None,
                start_time=segment.start_time,
                end_time=segment.end_time,
                sort_order=segment.sort_order,
                text=segment.text,
                confidence=segment.confidence,
            )
            self.db.add(new_segment)
            await self.db.flush()
            segment_id_map[segment.id] = new_segment.id

        for segment in segments:
            if segment.source_segment_id and segment.id in segment_id_map:
                new_seg = await self.db.get(Segment, segment_id_map[segment.id])
                mapped_source = segment_id_map.get(segment.source_segment_id)
                if new_seg and mapped_source:
                    new_seg.source_segment_id = mapped_source

        await self.db.commit()
        await self.db.refresh(new_project)

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
