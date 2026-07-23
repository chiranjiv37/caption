"""Expand schema for transcript-centric architecture.

Revision ID: 003
Revises: 002
Create Date: 2026-07-22 00:00:00.000000

Additive only:
- create transcripts table
- add nullable segment columns (transcript_id, source_segment_id, text, confidence)
- add speakers.voice_clone_id
- add projects.audio_path, projects.thumbnail_path
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "transcripts",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "language_code",
            sa.String(10),
            sa.ForeignKey("languages.code", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("type", sa.String(20), nullable=False),
        sa.Column(
            "parent_transcript_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("transcripts.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "status",
            sa.String(50),
            server_default="draft",
            nullable=False,
        ),
        sa.Column(
            "version",
            sa.Integer(),
            server_default="1",
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
        ),
        sa.UniqueConstraint(
            "project_id",
            "language_code",
            "version",
            name="uq_transcript_project_language_version",
        ),
        sa.CheckConstraint(
            "type IN ('original', 'translation')",
            name="ck_transcripts_type",
        ),
    )
    op.create_index("ix_transcripts_project_id", "transcripts", ["project_id"])
    op.create_index(
        "ix_transcripts_project_language",
        "transcripts",
        ["project_id", "language_code"],
    )
    op.create_index(
        "ix_transcripts_parent_transcript_id",
        "transcripts",
        ["parent_transcript_id"],
    )

    op.add_column(
        "segments",
        sa.Column(
            "transcript_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("transcripts.id", ondelete="CASCADE"),
            nullable=True,
        ),
    )
    op.add_column(
        "segments",
        sa.Column(
            "source_segment_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("segments.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.add_column(
        "segments",
        sa.Column(
            "text",
            sa.Text(),
            server_default="",
            nullable=False,
        ),
    )
    op.add_column(
        "segments",
        sa.Column("confidence", sa.Float(), nullable=True),
    )

    op.add_column(
        "speakers",
        sa.Column("voice_clone_id", sa.String(255), nullable=True),
    )

    op.add_column(
        "projects",
        sa.Column("audio_path", sa.String(500), nullable=True),
    )
    op.add_column(
        "projects",
        sa.Column("thumbnail_path", sa.String(500), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("projects", "thumbnail_path")
    op.drop_column("projects", "audio_path")
    op.drop_column("speakers", "voice_clone_id")
    op.drop_column("segments", "confidence")
    op.drop_column("segments", "text")
    op.drop_column("segments", "source_segment_id")
    op.drop_column("segments", "transcript_id")
    op.drop_index("ix_transcripts_parent_transcript_id", table_name="transcripts")
    op.drop_index("ix_transcripts_project_language", table_name="transcripts")
    op.drop_index("ix_transcripts_project_id", table_name="transcripts")
    op.drop_table("transcripts")
