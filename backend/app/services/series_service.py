"""Series service."""
import uuid
from typing import Optional, List

from fastapi import HTTPException, status
from sqlalchemy import select, func, and_, or_, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.series import Series, SeriesSpeaker, SeriesTerm, Episode, series_languages, Language
from app.models.project import Project
from app.schemas.series import (
    SeriesCreate,
    SeriesUpdate,
    SeriesSpeakerCreate,
    SeriesTermCreate,
    EpisodeCreate,
    SeriesReorderRequest,
)


class SeriesService:
    """Service for series operations."""

    # Hue palette for series (matches frontend)
    HUE_PALETTE = [265, 25, 150, 200, 330, 60]

    def __init__(self, db: AsyncSession):
        self.db = db

    def _get_next_hue(self, user_id: uuid.UUID) -> int:
        """Get the next hue from the palette based on user's series count."""
        # Count user's series
        return self.HUE_PALETTE[0]  # Default to first hue, will be updated by caller

    async def create_series(self, user_id: uuid.UUID, data: SeriesCreate) -> Series:
        """Create a new series."""
        # Get count of existing series to determine hue
        count_result = await self.db.execute(
            select(func.count()).select_from(
                select(Series).where(
                    and_(
                        Series.owner_id == user_id,
                        Series.is_deleted == False,
                    )
                ).subquery()
            )
        )
        series_count = count_result.scalar() or 0
        hue = self.HUE_PALETTE[series_count % len(self.HUE_PALETTE)]

        # Create series
        series = Series(
            name=data.name,
            description=data.description,
            hue=hue,
            owner_id=user_id,
        )

        self.db.add(series)
        await self.db.commit()
        await self.db.refresh(series)

        # Add languages if specified
        if data.languages:
            for lang_code in data.languages:
                lang_result = await self.db.execute(
                    select(Language).where(Language.code == lang_code)
                )
                lang = lang_result.scalar_one_or_none()
                if lang:
                    # Insert into association table
                    await self.db.execute(
                        series_languages.insert().values(
                            series_id=series.id,
                            language_code=lang.code,
                        )
                    )
            await self.db.commit()
            await self.db.refresh(series)

        return series

    async def get_series(
        self,
        series_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Optional[Series]:
        """Get a series by ID with user access check."""
        result = await self.db.execute(
            select(Series).where(
                and_(
                    Series.id == series_id,
                    Series.is_deleted == False,
                    Series.owner_id == user_id,
                )
            )
        )
        return result.scalar_one_or_none()

    async def get_series_detail(
        self,
        series_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Optional[Series]:
        """Get a series with all related data loaded."""
        result = await self.db.execute(
            select(Series).where(
                and_(
                    Series.id == series_id,
                    Series.is_deleted == False,
                    Series.owner_id == user_id,
                )
            )
        )
        series = result.scalar_one_or_none()

        if series:
            # Load related data
            await self.db.refresh(series, ['speakers', 'terms', 'episodes', 'languages'])

        return series

    async def list_series(
        self,
        user_id: uuid.UUID,
        search: Optional[str] = None,
        is_archived: Optional[bool] = None,
        sort_by: str = "updated_at",
        sort_order: str = "desc",
        page: int = 1,
        per_page: int = 20,
    ) -> tuple[List[Series], int]:
        """List series with filtering and pagination."""
        # Base query
        query = select(Series).where(
            and_(
                Series.is_deleted == False,
                Series.owner_id == user_id,
            )
        )

        # Apply filters
        if is_archived is not None:
            query = query.where(Series.is_archived == is_archived)
        else:
            # By default, exclude archived
            query = query.where(Series.is_archived == False)

        if search:
            search_filter = or_(
                Series.name.ilike(f"%{search}%"),
                Series.description.ilike(f"%{search}%"),
            )
            query = query.where(search_filter)

        # Get total count
        count_result = await self.db.execute(
            select(func.count()).select_from(query.subquery())
        )
        total = count_result.scalar()

        # Apply sorting
        sort_column = getattr(Series, sort_by, Series.updated_at)
        if sort_order == "desc":
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(asc(sort_column))

        # Apply pagination
        query = query.offset((page - 1) * per_page).limit(per_page)

        result = await self.db.execute(query)
        series_list = result.scalars().all()

        return list(series_list), total

    async def update_series(
        self,
        series_id: uuid.UUID,
        user_id: uuid.UUID,
        data: SeriesUpdate,
    ) -> Series:
        """Update a series."""
        series = await self.get_series(series_id, user_id)

        if not series:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Series not found",
            )

        # Update fields
        update_data = data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(series, field, value)

        await self.db.commit()
        await self.db.refresh(series)

        return series

    async def delete_series(
        self,
        series_id: uuid.UUID,
        user_id: uuid.UUID,
        permanent: bool = False,
    ) -> None:
        """Delete (soft or hard) a series."""
        series = await self.get_series(series_id, user_id)

        if not series:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Series not found",
            )

        if permanent:
            await self.db.delete(series)
        else:
            series.is_deleted = True

        await self.db.commit()

    async def toggle_archive_series(
        self,
        series_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Series:
        """Toggle archive status for a series."""
        series = await self.get_series(series_id, user_id)

        if not series:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Series not found",
            )

        series.is_archived = not series.is_archived
        await self.db.commit()
        await self.db.refresh(series)

        return series

    # Speaker management
    async def add_speaker(
        self,
        series_id: uuid.UUID,
        user_id: uuid.UUID,
        data: SeriesSpeakerCreate,
    ) -> SeriesSpeaker:
        """Add a speaker to a series."""
        series = await self.get_series(series_id, user_id)

        if not series:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Series not found",
            )

        speaker = SeriesSpeaker(
            series_id=series_id,
            name=data.name,
            meta=data.meta,
            hue=data.hue,
        )

        self.db.add(speaker)
        await self.db.commit()
        await self.db.refresh(speaker)

        return speaker

    async def remove_speaker(
        self,
        series_id: uuid.UUID,
        speaker_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> None:
        """Remove a speaker from a series."""
        series = await self.get_series(series_id, user_id)

        if not series:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Series not found",
            )

        result = await self.db.execute(
            select(SeriesSpeaker).where(
                and_(
                    SeriesSpeaker.id == speaker_id,
                    SeriesSpeaker.series_id == series_id,
                )
            )
        )
        speaker = result.scalar_one_or_none()

        if not speaker:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Speaker not found",
            )

        await self.db.delete(speaker)
        await self.db.commit()

    # Term management
    async def add_term(
        self,
        series_id: uuid.UUID,
        user_id: uuid.UUID,
        data: SeriesTermCreate,
    ) -> SeriesTerm:
        """Add a glossary term to a series."""
        series = await self.get_series(series_id, user_id)

        if not series:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Series not found",
            )

        term = SeriesTerm(
            series_id=series_id,
            term=data.term,
            rule=data.rule,
        )

        self.db.add(term)
        await self.db.commit()
        await self.db.refresh(term)

        return term

    async def remove_term(
        self,
        series_id: uuid.UUID,
        term_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> None:
        """Remove a glossary term from a series."""
        series = await self.get_series(series_id, user_id)

        if not series:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Series not found",
            )

        result = await self.db.execute(
            select(SeriesTerm).where(
                and_(
                    SeriesTerm.id == term_id,
                    SeriesTerm.series_id == series_id,
                )
            )
        )
        term = result.scalar_one_or_none()

        if not term:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Term not found",
            )

        await self.db.delete(term)
        await self.db.commit()

    # Episode management
    async def add_episode(
        self,
        series_id: uuid.UUID,
        user_id: uuid.UUID,
        data: EpisodeCreate,
    ) -> Episode:
        """Add an episode (project) to a series."""
        series = await self.get_series(series_id, user_id)

        if not series:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Series not found",
            )

        # Verify project exists and belongs to user
        result = await self.db.execute(
            select(Project).where(
                and_(
                    Project.id == data.project_id,
                    Project.owner_id == user_id,
                    Project.is_deleted == False,
                )
            )
        )
        project = result.scalar_one_or_none()

        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found",
            )

        # Get next sort order
        max_order_result = await self.db.execute(
            select(func.max(Episode.sort_order)).where(Episode.series_id == series_id)
        )
        max_order = max_order_result.scalar() or 0

        episode = Episode(
            series_id=series_id,
            project_id=data.project_id,
            title=data.title,
            meta=data.meta,
            sort_order=max_order + 1,
        )

        self.db.add(episode)

        # Update project's series_id
        project.series_id = series_id

        await self.db.commit()
        await self.db.refresh(episode)

        return episode

    async def remove_episode(
        self,
        series_id: uuid.UUID,
        episode_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> None:
        """Remove an episode from a series."""
        series = await self.get_series(series_id, user_id)

        if not series:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Series not found",
            )

        result = await self.db.execute(
            select(Episode).where(
                and_(
                    Episode.id == episode_id,
                    Episode.series_id == series_id,
                )
            )
        )
        episode = result.scalar_one_or_none()

        if not episode:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Episode not found",
            )

        # Update project's series_id to None
        result = await self.db.execute(
            select(Project).where(Project.id == episode.project_id)
        )
        project = result.scalar_one_or_none()
        if project:
            project.series_id = None

        await self.db.delete(episode)
        await self.db.commit()

    async def reorder_episodes(
        self,
        series_id: uuid.UUID,
        user_id: uuid.UUID,
        data: SeriesReorderRequest,
    ) -> List[Episode]:
        """Reorder episodes in a series."""
        series = await self.get_series(series_id, user_id)

        if not series:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Series not found",
            )

        # Update sort_order for each episode
        for index, episode_id in enumerate(data.episode_ids):
            result = await self.db.execute(
                select(Episode).where(
                    and_(
                        Episode.id == episode_id,
                        Episode.series_id == series_id,
                    )
                )
            )
            episode = result.scalar_one_or_none()
            if episode:
                episode.sort_order = index

        await self.db.commit()

        # Return updated episodes
        result = await self.db.execute(
            select(Episode).where(Episode.series_id == series_id).order_by(Episode.sort_order)
        )
        return list(result.scalars().all())
