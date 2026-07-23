"""Segment model for captions — belongs to a transcript."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import Float, Text, Integer, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, Mapped, mapped_column

from app.database import Base


class Segment(Base):
    """Caption segment with timing and text, owned by one transcript.

    sort_order acts as the segment index within the transcript.
    Translation segments set source_segment_id to the original segment.
    """

    __tablename__ = "segments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    transcript_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("transcripts.id", ondelete="CASCADE"),
        nullable=False,
    )
    source_segment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("segments.id", ondelete="SET NULL"),
        nullable=True,
    )
    speaker_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("speakers.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Timing in seconds (float for millisecond precision)
    start_time: Mapped[float] = mapped_column(Float, nullable=False)
    end_time: Mapped[float] = mapped_column(Float, nullable=False)

    # Display / index order within the transcript
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    # Subtitle text for this transcript's language
    text: Mapped[str] = mapped_column(Text, nullable=False, default="")

    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)

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
    transcript: Mapped["Transcript"] = relationship(
        "Transcript",
        back_populates="segments",
    )
    speaker: Mapped["Speaker | None"] = relationship(
        "Speaker",
        back_populates="segments",
    )
    source_segment: Mapped["Segment | None"] = relationship(
        "Segment",
        remote_side=[id],
        back_populates="translations",
        foreign_keys=[source_segment_id],
    )
    translations: Mapped[list["Segment"]] = relationship(
        "Segment",
        back_populates="source_segment",
        foreign_keys=[source_segment_id],
    )

    __table_args__ = (
        CheckConstraint(
            "end_time >= start_time",
            name="ck_segments_end_gte_start",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"Segment(id={self.id}, start={self.start_time:.2f}, "
            f"end={self.end_time:.2f})"
        )

    @property
    def duration(self) -> float:
        """Calculate segment duration."""
        return self.end_time - self.start_time
