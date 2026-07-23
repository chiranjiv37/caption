"""Transcript service for listing and fetching project transcripts."""
import uuid
from typing import Optional, List

from fastapi import HTTPException, status
from sqlalchemy import select, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transcript import Transcript
from app.services.project_service import ProjectService


class TranscriptService:
    """Service for transcript read operations."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.projects = ProjectService(db)

    async def list_transcripts(
        self,
        project_id: uuid.UUID,
        user_id: uuid.UUID,
        type: Optional[str] = None,
        language_code: Optional[str] = None,
    ) -> List[Transcript]:
        """List transcripts for a project the user can access."""
        await self.projects.require_project_access(project_id, user_id)

        query = select(Transcript).where(Transcript.project_id == project_id)

        if type is not None:
            query = query.where(Transcript.type == type)
        if language_code is not None:
            query = query.where(Transcript.language_code == language_code)

        query = query.order_by(
            Transcript.language_code.asc(),
            desc(Transcript.version),
        )

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_transcript(
        self,
        project_id: uuid.UUID,
        transcript_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Transcript:
        """Get a transcript belonging to the project."""
        await self.projects.require_project_access(project_id, user_id)

        result = await self.db.execute(
            select(Transcript).where(
                and_(
                    Transcript.id == transcript_id,
                    Transcript.project_id == project_id,
                )
            )
        )
        transcript = result.scalar_one_or_none()
        if not transcript:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transcript not found",
            )
        return transcript
