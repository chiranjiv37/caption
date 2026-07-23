"""Transcript model — one subtitle document per language/version."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Integer, DateTime, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, Mapped, mapped_column

from app.database import Base


class Transcript(Base):
    """A full subtitle document for a project in one language.

    Original transcripts have type='original' and parent_transcript_id=NULL.
    Translation transcripts have type='translation' and point at the original.
    """

    __tablename__ = "transcripts"

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
    language_code: Mapped[str] = mapped_column(
        String(10),
        ForeignKey("languages.code", ondelete="RESTRICT"),
        nullable=False,
    )
    type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )  # original | translation
    parent_transcript_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("transcripts.id", ondelete="SET NULL"),
        nullable=True,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default="draft",
        nullable=False,
    )
    version: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
    )

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
    project: Mapped["Project"] = relationship("Project", back_populates="transcripts")
    segments: Mapped[list["Segment"]] = relationship(
        "Segment",
        back_populates="transcript",
        cascade="all, delete-orphan",
        order_by="Segment.sort_order",
    )
    parent: Mapped["Transcript | None"] = relationship(
        "Transcript",
        remote_side=[id],
        back_populates="children",
        foreign_keys=[parent_transcript_id],
    )
    children: Mapped[list["Transcript"]] = relationship(
        "Transcript",
        back_populates="parent",
        foreign_keys=[parent_transcript_id],
    )

    __table_args__ = (
        UniqueConstraint(
            "project_id",
            "language_code",
            "version",
            name="uq_transcript_project_language_version",
        ),
        CheckConstraint(
            "type IN ('original', 'translation')",
            name="ck_transcripts_type",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"Transcript(id={self.id}, project_id={self.project_id}, "
            f"lang={self.language_code}, type={self.type})"
        )
