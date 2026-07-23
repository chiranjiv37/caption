"""Transcript, segment, and project-speaker routes nested under projects."""
from typing import List, Optional
import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.segment import (
    SegmentCreate,
    SegmentUpdate,
    SegmentResponse,
    SegmentBatchUpdateRequest,
    SegmentMergeRequest,
    SegmentSplitRequest,
)
from app.schemas.speaker import (
    SpeakerCreate,
    SpeakerUpdate,
    SpeakerResponse,
)
from app.schemas.transcript import TranscriptResponse
from app.services.segment_service import SegmentService
from app.services.speaker_service import SpeakerService
from app.services.transcript_service import TranscriptService

router = APIRouter(
    prefix="/projects/{project_id}",
    tags=["Transcripts", "Segments", "Speakers"],
)


# --- Transcripts ---

@router.get(
    "/transcripts",
    response_model=List[TranscriptResponse],
    summary="List project transcripts",
)
async def list_transcripts(
    project_id: uuid.UUID,
    type: Optional[str] = Query(None, description="Filter by type (original|translation)"),
    language_code: Optional[str] = Query(None, description="Filter by language code"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = TranscriptService(db)
    return await service.list_transcripts(
        project_id=project_id,
        user_id=current_user.id,
        type=type,
        language_code=language_code,
    )


@router.get(
    "/transcripts/{transcript_id}",
    response_model=TranscriptResponse,
    summary="Get transcript",
)
async def get_transcript(
    project_id: uuid.UUID,
    transcript_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = TranscriptService(db)
    return await service.get_transcript(
        project_id=project_id,
        transcript_id=transcript_id,
        user_id=current_user.id,
    )


# --- Segments under transcript ---

@router.get(
    "/transcripts/{transcript_id}/segments",
    response_model=List[SegmentResponse],
    summary="List transcript segments",
)
async def list_transcript_segments(
    project_id: uuid.UUID,
    transcript_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SegmentService(db)
    return await service.list_segments(
        project_id=project_id,
        transcript_id=transcript_id,
        user_id=current_user.id,
    )


@router.post(
    "/transcripts/{transcript_id}/segments",
    response_model=SegmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create segment",
)
async def create_segment(
    project_id: uuid.UUID,
    transcript_id: uuid.UUID,
    data: SegmentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SegmentService(db)
    return await service.create_segment(
        project_id=project_id,
        transcript_id=transcript_id,
        user_id=current_user.id,
        data=data,
    )


@router.put(
    "/transcripts/{transcript_id}/segments/batch",
    response_model=List[SegmentResponse],
    summary="Batch update segments",
)
async def batch_update_segments(
    project_id: uuid.UUID,
    transcript_id: uuid.UUID,
    data: SegmentBatchUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SegmentService(db)
    return await service.batch_update(
        project_id=project_id,
        transcript_id=transcript_id,
        user_id=current_user.id,
        data=data,
    )


@router.post(
    "/transcripts/{transcript_id}/segments/merge",
    response_model=SegmentResponse,
    summary="Merge segments",
)
async def merge_segments(
    project_id: uuid.UUID,
    transcript_id: uuid.UUID,
    data: SegmentMergeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SegmentService(db)
    return await service.merge_segments(
        project_id=project_id,
        transcript_id=transcript_id,
        user_id=current_user.id,
        data=data,
    )


# --- Segments by language / by id ---

@router.get(
    "/segments",
    response_model=List[SegmentResponse],
    summary="List segments by language",
)
async def list_segments_by_language(
    project_id: uuid.UUID,
    language_code: str = Query(..., description="Language code"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SegmentService(db)
    return await service.list_segments_by_language(
        project_id=project_id,
        language_code=language_code,
        user_id=current_user.id,
    )


@router.patch(
    "/segments/{segment_id}",
    response_model=SegmentResponse,
    summary="Update segment",
)
async def update_segment(
    project_id: uuid.UUID,
    segment_id: uuid.UUID,
    data: SegmentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SegmentService(db)
    return await service.update_segment(
        project_id=project_id,
        segment_id=segment_id,
        user_id=current_user.id,
        data=data,
    )


@router.delete(
    "/segments/{segment_id}",
    response_model=MessageResponse,
    summary="Delete segment",
)
async def delete_segment(
    project_id: uuid.UUID,
    segment_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SegmentService(db)
    await service.delete_segment(
        project_id=project_id,
        segment_id=segment_id,
        user_id=current_user.id,
    )
    return MessageResponse(message="Segment deleted")


@router.post(
    "/segments/{segment_id}/split",
    response_model=List[SegmentResponse],
    summary="Split segment",
)
async def split_segment(
    project_id: uuid.UUID,
    segment_id: uuid.UUID,
    data: SegmentSplitRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SegmentService(db)
    return await service.split_segment(
        project_id=project_id,
        segment_id=segment_id,
        user_id=current_user.id,
        data=data,
    )


# --- Project speakers ---

@router.get(
    "/speakers",
    response_model=List[SpeakerResponse],
    summary="List project speakers",
)
async def list_speakers(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SpeakerService(db)
    return await service.list_speakers(project_id, current_user.id)


@router.post(
    "/speakers",
    response_model=SpeakerResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create project speaker",
)
async def create_speaker(
    project_id: uuid.UUID,
    data: SpeakerCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SpeakerService(db)
    return await service.create_speaker(project_id, current_user.id, data)


@router.patch(
    "/speakers/{speaker_id}",
    response_model=SpeakerResponse,
    summary="Update project speaker",
)
async def update_speaker(
    project_id: uuid.UUID,
    speaker_id: uuid.UUID,
    data: SpeakerUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SpeakerService(db)
    return await service.update_speaker(
        project_id, speaker_id, current_user.id, data
    )


@router.delete(
    "/speakers/{speaker_id}",
    response_model=MessageResponse,
    summary="Delete project speaker",
)
async def delete_speaker(
    project_id: uuid.UUID,
    speaker_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SpeakerService(db)
    await service.delete_speaker(project_id, speaker_id, current_user.id)
    return MessageResponse(message="Speaker deleted")
