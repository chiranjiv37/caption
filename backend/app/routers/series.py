"""Series router."""
from typing import Optional
import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.series import (
    SeriesCreate,
    SeriesUpdate,
    SeriesListResponse,
    SeriesDetailResponse,
    SeriesSpeakerCreate,
    SeriesSpeakerResponse,
    SeriesTermCreate,
    SeriesTermResponse,
    EpisodeCreate,
    EpisodeResponse,
    SeriesReorderRequest,
    LanguageResponse,
)
from app.schemas.common import PaginatedResponse, MessageResponse
from app.services.series_service import SeriesService

router = APIRouter(prefix="/series", tags=["Series"])


def _series_to_list_response(series, episode_count=0, languages=None) -> SeriesListResponse:
    """Convert Series model to list response schema."""
    return SeriesListResponse(
        id=series.id,
        name=series.name,
        description=series.description,
        hue=series.hue,
        is_archived=series.is_archived,
        is_deleted=series.is_deleted,
        owner_id=series.owner_id,
        created_at=series.created_at,
        updated_at=series.updated_at,
        episode_count=episode_count,
        languages=languages or [],
    )


def _series_to_detail_response(series) -> SeriesDetailResponse:
    """Convert Series model to detail response schema."""
    return SeriesDetailResponse(
        id=series.id,
        name=series.name,
        description=series.description,
        hue=series.hue,
        is_archived=series.is_archived,
        is_deleted=series.is_deleted,
        owner_id=series.owner_id,
        created_at=series.created_at,
        updated_at=series.updated_at,
        episode_count=len(series.episodes) if hasattr(series, 'episodes') else 0,
        languages=[lang.code for lang in series.languages] if hasattr(series, 'languages') else [],
        speakers=[
            SeriesSpeakerResponse(
                id=s.id,
                series_id=s.series_id,
                name=s.name,
                meta=s.meta,
                hue=s.hue,
                created_at=s.created_at,
            )
            for s in (series.speakers if hasattr(series, 'speakers') else [])
        ],
        terms=[
            SeriesTermResponse(
                id=t.id,
                series_id=t.series_id,
                term=t.term,
                rule=t.rule,
                created_at=t.created_at,
            )
            for t in (series.terms if hasattr(series, 'terms') else [])
        ],
        episodes=[
            EpisodeResponse(
                id=e.id,
                series_id=e.series_id,
                project_id=e.project_id,
                title=e.title,
                meta=e.meta,
                status=e.status,
                sort_order=e.sort_order,
                created_at=e.created_at,
            )
            for e in (series.episodes if hasattr(series, 'episodes') else [])
        ],
    )


@router.get(
    "/",
    response_model=PaginatedResponse[SeriesListResponse],
    summary="List series",
)
async def list_series(
    search: Optional[str] = Query(None, description="Search by name/description"),
    archived: Optional[bool] = Query(None, description="Filter by archived"),
    sort_by: str = Query("updated_at", description="Sort field"),
    sort_order: str = Query("desc", description="Sort order (asc/desc)"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all series for the current user with filtering."""
    series_service = SeriesService(db)
    series_list, total = await series_service.list_series(
        user_id=current_user.id,
        search=search,
        is_archived=archived,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        per_page=per_page,
    )

    total_pages = (total + per_page - 1) // per_page

    # Convert to response schema
    items = []
    for series in series_list:
        # Count episodes and get languages
        episode_count = len(series.episodes) if hasattr(series, 'episodes') else 0
        languages = [lang.code for lang in series.languages] if hasattr(series, 'languages') else []
        items.append(_series_to_list_response(series, episode_count, languages))

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
    "/",
    response_model=SeriesDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create series",
)
async def create_series(
    data: SeriesCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new series."""
    series_service = SeriesService(db)
    series = await series_service.create_series(current_user.id, data)
    return _series_to_detail_response(series)


@router.get(
    "/{series_id}",
    response_model=SeriesDetailResponse,
    summary="Get series",
)
async def get_series(
    series_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific series by ID with all details."""
    series_service = SeriesService(db)
    series = await series_service.get_series_detail(series_id, current_user.id)

    if not series:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Series not found",
        )

    return _series_to_detail_response(series)


@router.put(
    "/{series_id}",
    response_model=SeriesDetailResponse,
    summary="Update series",
)
async def update_series(
    series_id: uuid.UUID,
    data: SeriesUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a series."""
    series_service = SeriesService(db)
    series = await series_service.update_series(
        series_id, current_user.id, data
    )
    return _series_to_detail_response(series)


@router.delete(
    "/{series_id}",
    response_model=MessageResponse,
    summary="Delete series",
)
async def delete_series(
    series_id: uuid.UUID,
    permanent: bool = Query(False, description="Permanently delete"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a series (soft delete by default)."""
    series_service = SeriesService(db)
    await series_service.delete_series(
        series_id, current_user.id, permanent=permanent
    )
    return MessageResponse(message="Series deleted successfully")


@router.post(
    "/{series_id}/archive",
    response_model=SeriesDetailResponse,
    summary="Toggle archive",
)
async def toggle_archive(
    series_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Toggle archive status for a series."""
    series_service = SeriesService(db)
    series = await series_service.toggle_archive_series(series_id, current_user.id)
    return _series_to_detail_response(series)


# Speaker endpoints
@router.post(
    "/{series_id}/speakers",
    response_model=SeriesSpeakerResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add speaker",
)
async def add_speaker(
    series_id: uuid.UUID,
    data: SeriesSpeakerCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a speaker to a series."""
    series_service = SeriesService(db)
    speaker = await series_service.add_speaker(series_id, current_user.id, data)
    return SeriesSpeakerResponse(
        id=speaker.id,
        series_id=speaker.series_id,
        name=speaker.name,
        meta=speaker.meta,
        hue=speaker.hue,
        created_at=speaker.created_at,
    )


@router.delete(
    "/{series_id}/speakers/{speaker_id}",
    response_model=MessageResponse,
    summary="Remove speaker",
)
async def remove_speaker(
    series_id: uuid.UUID,
    speaker_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a speaker from a series."""
    series_service = SeriesService(db)
    await series_service.remove_speaker(series_id, speaker_id, current_user.id)
    return MessageResponse(message="Speaker removed successfully")


# Term endpoints
@router.post(
    "/{series_id}/terms",
    response_model=SeriesTermResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add term",
)
async def add_term(
    series_id: uuid.UUID,
    data: SeriesTermCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a glossary term to a series."""
    series_service = SeriesService(db)
    term = await series_service.add_term(series_id, current_user.id, data)
    return SeriesTermResponse(
        id=term.id,
        series_id=term.series_id,
        term=term.term,
        rule=term.rule,
        created_at=term.created_at,
    )


@router.delete(
    "/{series_id}/terms/{term_id}",
    response_model=MessageResponse,
    summary="Remove term",
)
async def remove_term(
    series_id: uuid.UUID,
    term_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a glossary term from a series."""
    series_service = SeriesService(db)
    await series_service.remove_term(series_id, term_id, current_user.id)
    return MessageResponse(message="Term removed successfully")


# Episode endpoints
@router.post(
    "/{series_id}/episodes",
    response_model=EpisodeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add episode",
)
async def add_episode(
    series_id: uuid.UUID,
    data: EpisodeCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add an episode (project) to a series."""
    series_service = SeriesService(db)
    episode = await series_service.add_episode(series_id, current_user.id, data)
    return EpisodeResponse(
        id=episode.id,
        series_id=episode.series_id,
        project_id=episode.project_id,
        title=episode.title,
        meta=episode.meta,
        status=episode.status,
        sort_order=episode.sort_order,
        created_at=episode.created_at,
    )


@router.delete(
    "/{series_id}/episodes/{episode_id}",
    response_model=MessageResponse,
    summary="Remove episode",
)
async def remove_episode(
    series_id: uuid.UUID,
    episode_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove an episode from a series."""
    series_service = SeriesService(db)
    await series_service.remove_episode(series_id, episode_id, current_user.id)
    return MessageResponse(message="Episode removed successfully")


@router.post(
    "/{series_id}/reorder",
    response_model=list[EpisodeResponse],
    summary="Reorder episodes",
)
async def reorder_episodes(
    series_id: uuid.UUID,
    data: SeriesReorderRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Reorder episodes in a series."""
    series_service = SeriesService(db)
    episodes = await series_service.reorder_episodes(series_id, current_user.id, data)
    return [
        EpisodeResponse(
            id=e.id,
            series_id=e.series_id,
            project_id=e.project_id,
            title=e.title,
            meta=e.meta,
            status=e.status,
            sort_order=e.sort_order,
            created_at=e.created_at,
        )
        for e in episodes
    ]
