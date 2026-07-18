"""Asset model for file storage."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import String, BigInteger, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, Mapped, mapped_column

from app.database import Base


class Asset(Base):
    """Asset model for uploaded files."""

    __tablename__ = "assets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    path: Mapped[str] = mapped_column(String(500), nullable=False, default="")  # folder path
    storage_key: Mapped[str] = mapped_column(String(500), nullable=False)  # S3 key

    file_size: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    mime_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    kind: Mapped[str | None] = mapped_column(String(50), nullable=True)  # video, audio, srt, vtt, etc
    duration_seconds: Mapped[int | None] = mapped_column(BigInteger, nullable=True)  # for video/audio

    is_flagged: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    owner: Mapped["User"] = relationship("User", back_populates="assets")

    def __repr__(self) -> str:
        return f"Asset(id={self.id}, name={self.name})"

    @property
    def full_path(self) -> str:
        """Get full path including folder."""
        if self.path:
            return f"{self.path}/{self.name}"
        return self.name
