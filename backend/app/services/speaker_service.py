"""Project speaker service."""
import uuid
from typing import List

from fastapi import HTTPException, status
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.segment import Segment
from app.models.speaker import Speaker
from app.schemas.speaker import SpeakerCreate, SpeakerUpdate, SpeakerResponse
from app.services.project_service import ProjectService


class SpeakerService:
    """Service for per-project speakers."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.projects = ProjectService(db)

    async def _get_speaker(
        self,
        project_id: uuid.UUID,
        speaker_id: uuid.UUID,
    ) -> Speaker:
        result = await self.db.execute(
            select(Speaker).where(
                and_(
                    Speaker.id == speaker_id,
                    Speaker.project_id == project_id,
                )
            )
        )
        speaker = result.scalar_one_or_none()
        if not speaker:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Speaker not found",
            )
        return speaker

    async def _segment_count(self, speaker_id: uuid.UUID) -> int:
        result = await self.db.execute(
            select(func.count())
            .select_from(Segment)
            .where(Segment.speaker_id == speaker_id)
        )
        return int(result.scalar() or 0)

    async def _to_response(self, speaker: Speaker) -> SpeakerResponse:
        return SpeakerResponse(
            id=speaker.id,
            project_id=speaker.project_id,
            name=speaker.name,
            hue=speaker.hue,
            voice_clone_id=speaker.voice_clone_id,
            created_at=speaker.created_at,
            segment_count=await self._segment_count(speaker.id),
        )

    async def list_speakers(
        self,
        project_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> List[SpeakerResponse]:
        await self.projects.require_project_access(project_id, user_id)

        result = await self.db.execute(
            select(Speaker)
            .where(Speaker.project_id == project_id)
            .order_by(Speaker.created_at.asc())
        )
        speakers = list(result.scalars().all())
        return [await self._to_response(s) for s in speakers]

    async def create_speaker(
        self,
        project_id: uuid.UUID,
        user_id: uuid.UUID,
        data: SpeakerCreate,
    ) -> SpeakerResponse:
        await self.projects.require_project_edit(project_id, user_id)

        speaker = Speaker(
            project_id=project_id,
            name=data.name,
            hue=data.hue,
            voice_clone_id=data.voice_clone_id,
        )
        self.db.add(speaker)
        await self.db.commit()
        await self.db.refresh(speaker)
        return await self._to_response(speaker)

    async def update_speaker(
        self,
        project_id: uuid.UUID,
        speaker_id: uuid.UUID,
        user_id: uuid.UUID,
        data: SpeakerUpdate,
    ) -> SpeakerResponse:
        await self.projects.require_project_edit(project_id, user_id)
        speaker = await self._get_speaker(project_id, speaker_id)

        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(speaker, field, value)

        await self.db.commit()
        await self.db.refresh(speaker)
        return await self._to_response(speaker)

    async def delete_speaker(
        self,
        project_id: uuid.UUID,
        speaker_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> None:
        await self.projects.require_project_edit(project_id, user_id)
        speaker = await self._get_speaker(project_id, speaker_id)
        await self.db.delete(speaker)
        await self.db.commit()
