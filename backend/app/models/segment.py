"""Segment model for captions."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import Float, Text, String, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, Mapped, mapped_column

from app.database import Base


class Segment(Base):
    """Caption segment with timing information."""

    __tablename__ = "segments"

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
    speaker_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("speakers.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Timing in seconds (float for millisecond precision)
    start_time: Mapped[float] = mapped_column(Float, nullable=False)
    end_time: Mapped[float] = mapped_column(Float, nullable=False)

    # Display order for manual sorting
    sort_order: Mapped[int] = mapped_column(default=0)

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
    project: Mapped["Project"] = relationship("Project", back_populates="segments")
    speaker: Mapped["Speaker | None"] = relationship("Speaker", back_populates="segments")
    texts: Mapped[list["SegmentText"]] = relationship(
        "SegmentText",
        back_populates="segment",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"Segment(id={self.id}, start={self.start_time:.2f}, end={self.end_time:.2f})"

    @property
    def duration(self) -> float:
        """Calculate segment duration."""
        return self.end_time - self.start_time


class SegmentText(Base):
    """Multi-language text for a segment."""

    __tablename__ = "segment_texts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    segment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("segments.id", ondelete="CASCADE"),
        nullable=False,
    )
    language_code: Mapped[str] = mapped_column(String(10), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False, default="")
    is_machine_translated: Mapped[bool] = mapped_column(Boolean, default=False)

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
    segment: Mapped["Segment"] = relationship("Segment", back_populates="texts")

    __table_args__ = (
        UniqueConstraint("segment_id", "language_code", name="uq_segment_language"),
    )

    def __repr__(self) -> str:
        return f"SegmentText(segment_id={self.segment_id}, lang={self.language_code})"
