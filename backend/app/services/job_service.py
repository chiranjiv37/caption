"""Job service for managing transcription jobs."""
import uuid
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models.project import Project
from app.tasks.transcribe import transcribe_video


class JobService:
    """Service for creating and managing transcription jobs."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_project(self, project_id: uuid.UUID, user_id: uuid.UUID) -> Optional[Project]:
        """Get a project by ID with ownership check."""
        result = await self.db.execute(
            select(Project).where(
                and_(
                    Project.id == project_id,
                    Project.is_deleted == False,
                    Project.owner_id == user_id,
                )
            )
        )
        return result.scalar_one_or_none()

    async def create_transcription_job(
        self,
        project_id: uuid.UUID,
        file_path: str,
        language: str = "en",
        context: Optional[str] = None,
    ) -> str:
        """Create a transcription job for a project.

        Args:
            project_id: The project ID to transcribe
            file_path: Path to the audio/video file on disk
            language: Source language code
            context: Optional context for transcription

        Returns:
            str: The generated job ID
        """
        job_id = str(uuid.uuid4())

        result = await self.db.execute(
            select(Project).where(Project.id == project_id)
        )
        project = result.scalar_one_or_none()
        if not project:
            raise ValueError("Project not found")

        # Update project job tracking
        project.job_id = job_id
        project.job_status = "uploading"
        project.job_progress = 0
        project.job_message = "Uploading file..."

        await self.db.commit()
        await self.db.refresh(project)

        # Queue the transcription task with file path
        transcribe_video.delay(
            job_id=job_id,
            project_id=str(project_id),
            file_path=file_path,
            language=language,
            context=context,
        )

        return job_id

    async def update_job_status(
        self,
        project_id: uuid.UUID,
        status: str,
        progress: int,
        message: Optional[str] = None,
        result: Optional[dict] = None,
    ) -> None:
        """Update the job status for a project."""
        result_query = await self.db.execute(
            select(Project).where(Project.id == project_id)
        )
        project = result_query.scalar_one_or_none()
        if not project:
            return

        project.job_status = status
        project.job_progress = progress
        if message is not None:
            project.job_message = message
        if result is not None:
            project.transcription_result = result

        await self.db.commit()
