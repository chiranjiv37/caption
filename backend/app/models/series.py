"""Series model."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Text, Integer, Boolean, DateTime, ForeignKey, Table, Column
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, Mapped, mapped_column

from app.database import Base


# Many-to-many association table for series languages
series_languages = Table(
    "series_languages",
    Base.metadata,
    Column("series_id", UUID(as_uuid=True), ForeignKey("series.id", ondelete="CASCADE"), primary_key=True),
    Column("language_code", String(10), ForeignKey("languages.code", ondelete="CASCADE"), primary_key=True),
)


class Series(Base):
    """Series model for grouping related projects/episodes."""

    __tablename__ = "series"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    hue: Mapped[int] = mapped_column(Integer, default=265)  # Color for UI

    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    owner: Mapped["User"] = relationship("User", back_populates="series")
    projects: Mapped[list["Project"]] = relationship(
        "Project",
        back_populates="series_obj",
        foreign_keys="Project.series_id",
    )
    speakers: Mapped[list["SeriesSpeaker"]] = relationship(
        "SeriesSpeaker",
        back_populates="series",
        cascade="all, delete-orphan",
    )
    terms: Mapped[list["SeriesTerm"]] = relationship(
        "SeriesTerm",
        back_populates="series",
        cascade="all, delete-orphan",
    )
    episodes: Mapped[list["Episode"]] = relationship(
        "Episode",
        back_populates="series",
        cascade="all, delete-orphan",
        order_by="Episode.sort_order",
    )
    languages: Mapped[list[str]] = relationship(
        "Language",
        secondary=series_languages,
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"Series(id={self.id}, name={self.name})"


class SeriesSpeaker(Base):
    """Speaker definition within a series (shared across episodes)."""

    __tablename__ = "series_speakers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    series_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("series.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    meta: Mapped[str | None] = mapped_column(String(255), nullable=True)  # Description like "Host · 62%"
    hue: Mapped[int] = mapped_column(Integer, default=265)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    series: Mapped["Series"] = relationship("Series", back_populates="speakers")

    def __repr__(self) -> str:
        return f"SeriesSpeaker(id={self.id}, name={self.name})"


class SeriesTerm(Base):
    """Glossary term for translation within a series."""

    __tablename__ = "series_terms"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    series_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("series.id", ondelete="CASCADE"),
        nullable=False,
    )
    term: Mapped[str] = mapped_column(String(255), nullable=False)
    rule: Mapped[str] = mapped_column(Text, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    series: Mapped["Series"] = relationship("Series", back_populates="terms")

    def __repr__(self) -> str:
        return f"SeriesTerm(id={self.id}, term={self.term})"


class Language(Base):
    """Language reference table."""

    __tablename__ = "languages"

    code: Mapped[str] = mapped_column(String(10), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    native_name: Mapped[str | None] = mapped_column(String(100), nullable=True)

    def __repr__(self) -> str:
        return f"Language(code={self.code}, name={self.name})"


class Episode(Base):
    """Episode linking projects to series with ordering."""

    __tablename__ = "episodes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    series_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("series.id", ondelete="CASCADE"),
        nullable=False,
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    meta: Mapped[str | None] = mapped_column(String(255), nullable=True)  # "48:12 · 4 speakers"
    status: Mapped[str] = mapped_column(String(50), default="transcribed")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    series: Mapped["Series"] = relationship("Series", back_populates="episodes")
    project: Mapped["Project"] = relationship("Project", back_populates="episode")

    def __repr__(self) -> str:
        return f"Episode(id={self.id}, title={self.title})"
