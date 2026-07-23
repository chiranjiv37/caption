"""Segment service for caption CRUD under transcripts."""
import uuid
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.segment import Segment
from app.models.transcript import Transcript
from app.schemas.segment import (
    SegmentCreate,
    SegmentUpdate,
    SegmentBatchUpdateRequest,
    SegmentMergeRequest,
    SegmentSplitRequest,
)
from app.services.project_service import ProjectService


class SegmentService:
    """Service for segment operations via transcript ownership."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.projects = ProjectService(db)

    async def _get_transcript_for_project(
        self,
        project_id: uuid.UUID,
        transcript_id: uuid.UUID,
    ) -> Transcript:
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

    async def _get_segment_for_project(
        self,
        project_id: uuid.UUID,
        segment_id: uuid.UUID,
    ) -> Segment:
        result = await self.db.execute(
            select(Segment)
            .join(Transcript, Segment.transcript_id == Transcript.id)
            .where(
                and_(
                    Segment.id == segment_id,
                    Transcript.project_id == project_id,
                )
            )
        )
        segment = result.scalar_one_or_none()
        if not segment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Segment not found",
            )
        return segment

    def _validate_timing(self, start_time: float, end_time: float) -> None:
        if end_time < start_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="end_time must be greater than or equal to start_time",
            )

    async def _reindex_sort_order(self, transcript_id: uuid.UUID) -> None:
        result = await self.db.execute(
            select(Segment)
            .where(Segment.transcript_id == transcript_id)
            .order_by(Segment.sort_order.asc(), Segment.start_time.asc())
        )
        segments = list(result.scalars().all())
        for index, segment in enumerate(segments):
            segment.sort_order = index
        await self.db.flush()

    async def list_segments(
        self,
        project_id: uuid.UUID,
        transcript_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> List[Segment]:
        await self.projects.require_project_access(project_id, user_id)
        await self._get_transcript_for_project(project_id, transcript_id)

        result = await self.db.execute(
            select(Segment)
            .where(Segment.transcript_id == transcript_id)
            .order_by(Segment.sort_order.asc(), Segment.start_time.asc())
        )
        return list(result.scalars().all())

    async def list_segments_by_language(
        self,
        project_id: uuid.UUID,
        language_code: str,
        user_id: uuid.UUID,
    ) -> List[Segment]:
        await self.projects.require_project_access(project_id, user_id)

        result = await self.db.execute(
            select(Transcript)
            .where(
                and_(
                    Transcript.project_id == project_id,
                    Transcript.language_code == language_code,
                )
            )
            .order_by(Transcript.version.desc())
            .limit(1)
        )
        transcript = result.scalar_one_or_none()
        if not transcript:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No transcript found for language",
            )

        return await self.list_segments(project_id, transcript.id, user_id)

    async def create_segment(
        self,
        project_id: uuid.UUID,
        transcript_id: uuid.UUID,
        user_id: uuid.UUID,
        data: SegmentCreate,
    ) -> Segment:
        await self.projects.require_project_edit(project_id, user_id)
        await self._get_transcript_for_project(project_id, transcript_id)
        self._validate_timing(data.start_time, data.end_time)

        segment = Segment(
            transcript_id=transcript_id,
            speaker_id=data.speaker_id,
            source_segment_id=data.source_segment_id,
            start_time=data.start_time,
            end_time=data.end_time,
            sort_order=data.sort_order,
            text=data.text or "",
            confidence=data.confidence,
        )
        self.db.add(segment)
        await self.db.commit()
        await self.db.refresh(segment)
        return segment

    async def update_segment(
        self,
        project_id: uuid.UUID,
        segment_id: uuid.UUID,
        user_id: uuid.UUID,
        data: SegmentUpdate,
    ) -> Segment:
        await self.projects.require_project_edit(project_id, user_id)
        segment = await self._get_segment_for_project(project_id, segment_id)

        updates = data.model_dump(exclude_unset=True)
        start = updates.get("start_time", segment.start_time)
        end = updates.get("end_time", segment.end_time)
        self._validate_timing(start, end)

        for field, value in updates.items():
            setattr(segment, field, value)

        await self.db.commit()
        await self.db.refresh(segment)
        return segment

    async def delete_segment(
        self,
        project_id: uuid.UUID,
        segment_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> None:
        await self.projects.require_project_edit(project_id, user_id)
        segment = await self._get_segment_for_project(project_id, segment_id)
        transcript_id = segment.transcript_id
        await self.db.delete(segment)
        await self.db.flush()
        await self._reindex_sort_order(transcript_id)
        await self.db.commit()

    async def batch_update(
        self,
        project_id: uuid.UUID,
        transcript_id: uuid.UUID,
        user_id: uuid.UUID,
        data: SegmentBatchUpdateRequest,
    ) -> List[Segment]:
        await self.projects.require_project_edit(project_id, user_id)
        await self._get_transcript_for_project(project_id, transcript_id)

        if not data.segments:
            return []

        ids = [item.id for item in data.segments]
        result = await self.db.execute(
            select(Segment).where(
                and_(
                    Segment.transcript_id == transcript_id,
                    Segment.id.in_(ids),
                )
            )
        )
        segments_by_id = {s.id: s for s in result.scalars().all()}

        if len(segments_by_id) != len(set(ids)):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="One or more segments not found in transcript",
            )

        for item in data.segments:
            segment = segments_by_id[item.id]
            updates = item.model_dump(exclude_unset=True, exclude={"id"})
            start = updates.get("start_time", segment.start_time)
            end = updates.get("end_time", segment.end_time)
            self._validate_timing(start, end)
            for field, value in updates.items():
                setattr(segment, field, value)

        await self.db.commit()
        for segment in segments_by_id.values():
            await self.db.refresh(segment)

        return [
            segments_by_id[item.id]
            for item in data.segments
        ]

    async def merge_segments(
        self,
        project_id: uuid.UUID,
        transcript_id: uuid.UUID,
        user_id: uuid.UUID,
        data: SegmentMergeRequest,
    ) -> Segment:
        await self.projects.require_project_edit(project_id, user_id)
        await self._get_transcript_for_project(project_id, transcript_id)

        if len(data.segment_ids) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least two segments are required to merge",
            )

        result = await self.db.execute(
            select(Segment)
            .where(
                and_(
                    Segment.transcript_id == transcript_id,
                    Segment.id.in_(data.segment_ids),
                )
            )
            .order_by(Segment.sort_order.asc(), Segment.start_time.asc())
        )
        segments = list(result.scalars().all())

        if len(segments) != len(set(data.segment_ids)):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="One or more segments not found in transcript",
            )

        merged_text = " ".join(s.text.strip() for s in segments if s.text.strip())
        speaker_id = next((s.speaker_id for s in segments if s.speaker_id), None)
        start_time = min(s.start_time for s in segments)
        end_time = max(s.end_time for s in segments)
        sort_order = min(s.sort_order for s in segments)

        merged = Segment(
            transcript_id=transcript_id,
            speaker_id=speaker_id,
            start_time=start_time,
            end_time=end_time,
            sort_order=sort_order,
            text=merged_text,
        )
        self.db.add(merged)

        for segment in segments:
            await self.db.delete(segment)

        await self.db.flush()
        await self._reindex_sort_order(transcript_id)
        await self.db.commit()
        await self.db.refresh(merged)
        return merged

    async def split_segment(
        self,
        project_id: uuid.UUID,
        segment_id: uuid.UUID,
        user_id: uuid.UUID,
        data: SegmentSplitRequest,
    ) -> List[Segment]:
        await self.projects.require_project_edit(project_id, user_id)
        segment = await self._get_segment_for_project(project_id, segment_id)

        if not (segment.start_time < data.split_at < segment.end_time):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="split_at must be strictly between start_time and end_time",
            )

        right = Segment(
            transcript_id=segment.transcript_id,
            speaker_id=segment.speaker_id,
            source_segment_id=segment.source_segment_id,
            start_time=data.split_at,
            end_time=segment.end_time,
            sort_order=segment.sort_order + 1,
            text="",
            confidence=None,
        )
        segment.end_time = data.split_at
        self.db.add(right)
        await self.db.flush()
        await self._reindex_sort_order(segment.transcript_id)
        await self.db.commit()
        await self.db.refresh(segment)
        await self.db.refresh(right)
        return [segment, right]
