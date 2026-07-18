"""Project model."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Text, Integer, Boolean, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, Mapped, mapped_column

from app.database import Base


class Project(Base):
    """Project model for caption projects."""

    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Auto-generated from name for UI
    initial: Mapped[str] = mapped_column(
        String(1),
        nullable=False,
        default="P",
    )
    tile: Mapped[int] = mapped_column(Integer, default=0)  # Color hue index

    # Duration
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    duration_display: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Status and role
    status: Mapped[str] = mapped_column(
        String(50),
        default="transcribed",
        nullable=False,
    )  # transcribed, translated, captioned
    role: Mapped[str] = mapped_column(
        String(50),
        default="owner",
        nullable=False,
    )  # owner, edit, view

    source_language: Mapped[str] = mapped_column(
        String(10),
        default="en",
        nullable=False,
    )

    # Foreign keys
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    series_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("series.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Flags
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False)

    # Storage
    storage_key: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Timestamps
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
    owner: Mapped["User"] = relationship("User", back_populates="projects")
    series_obj: Mapped["Series | None"] = relationship(
        "Series",
        back_populates="projects",
        foreign_keys=[series_id],
    )
    segments: Mapped[list["Segment"]] = relationship(
        "Segment",
        back_populates="project",
        cascade="all, delete-orphan",
    )
    speakers: Mapped[list["Speaker"]] = relationship(
        "Speaker",
        back_populates="project",
        cascade="all, delete-orphan",
    )
    shares: Mapped[list["ProjectShare"]] = relationship(
        "ProjectShare",
        back_populates="project",
        cascade="all, delete-orphan",
    )
    episode: Mapped["Episode | None"] = relationship(
        "Episode",
        back_populates="project",
        uselist=False,
    )

    def __repr__(self) -> str:
        return f"Project(id={self.id}, name={self.name})"


class ProjectShare(Base):
    """Project sharing/collaboration model."""

    __tablename__ = "project_shares"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    role: Mapped[str] = mapped_column(
        String(50),
        default="view",
        nullable=False,
    )  # view, edit

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="shares")
    user: Mapped["User"] = relationship("User")

    __table_args__ = (
        # Unique constraint to prevent duplicate shares
        {"sqlite_autoincrement": True},
    )

    def __repr__(self) -> str:
        return f"ProjectShare(project_id={self.project_id}, user_id={self.user_id})"
