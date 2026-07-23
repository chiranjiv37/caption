"""Contract segments onto transcripts; drop segment_texts and project_id.

Revision ID: 005
Revises: 004
Create Date: 2026-07-22 00:02:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    orphan_count = conn.execute(
        sa.text("SELECT COUNT(*) FROM segments WHERE transcript_id IS NULL")
    ).scalar_one()
    if orphan_count:
        raise RuntimeError(
            f"Cannot contract: {orphan_count} segment(s) still missing transcript_id. "
            "Run backfill migration 004 first."
        )

    op.alter_column(
        "segments",
        "transcript_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
    )

    # Drop project_id FK + index + column
    # Discover FK name if needed; 001 created inline FK on segments.project_id
    inspector = sa.inspect(conn)
    fks = inspector.get_foreign_keys("segments")
    for fk in fks:
        if fk.get("constrained_columns") == ["project_id"]:
            op.drop_constraint(fk["name"], "segments", type_="foreignkey")
            break

    indexes = {idx["name"] for idx in inspector.get_indexes("segments")}
    if "ix_segments_project_id" in indexes:
        op.drop_index("ix_segments_project_id", table_name="segments")

    op.drop_column("segments", "project_id")

    op.drop_table("segment_texts")

    op.create_index(
        "ix_segments_transcript_sort",
        "segments",
        ["transcript_id", "sort_order"],
    )
    op.create_index(
        "ix_segments_source_segment_id",
        "segments",
        ["source_segment_id"],
    )
    op.create_index(
        "ix_segments_speaker_id",
        "segments",
        ["speaker_id"],
    )
    op.create_index(
        "ix_speakers_project_id",
        "speakers",
        ["project_id"],
    )

    # Avoid duplicate check if somehow present
    op.create_check_constraint(
        "ck_segments_end_gte_start",
        "segments",
        "end_time >= start_time",
    )


def downgrade() -> None:
    op.drop_constraint("ck_segments_end_gte_start", "segments", type_="check")
    op.drop_index("ix_speakers_project_id", table_name="speakers")
    op.drop_index("ix_segments_speaker_id", table_name="segments")
    op.drop_index("ix_segments_source_segment_id", table_name="segments")
    op.drop_index("ix_segments_transcript_sort", table_name="segments")

    op.create_table(
        "segment_texts",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "segment_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("segments.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("language_code", sa.String(10), nullable=False),
        sa.Column("text", sa.Text(), nullable=False, server_default=""),
        sa.Column(
            "is_machine_translated",
            sa.Boolean(),
            server_default="false",
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
            "segment_id",
            "language_code",
            name="uq_segment_language",
        ),
    )

    op.add_column(
        "segments",
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
    )

    # Restore project_id from transcript
    op.execute(
        sa.text(
            """
            UPDATE segments s
            SET project_id = t.project_id
            FROM transcripts t
            WHERE s.transcript_id = t.id
            """
        )
    )

    op.alter_column(
        "segments",
        "project_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
    )
    op.create_foreign_key(
        "segments_project_id_fkey",
        "segments",
        "projects",
        ["project_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index("ix_segments_project_id", "segments", ["project_id"])

    # Rebuild segment_texts from segments + transcript language
    op.execute(
        sa.text(
            """
            INSERT INTO segment_texts (
                id, segment_id, language_code, text,
                is_machine_translated, created_at, updated_at
            )
            SELECT
                gen_random_uuid(),
                s.id,
                t.language_code,
                s.text,
                (t.type = 'translation'),
                NOW(),
                NOW()
            FROM segments s
            INNER JOIN transcripts t ON t.id = s.transcript_id
            """
        )
    )

    op.alter_column(
        "segments",
        "transcript_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=True,
    )
