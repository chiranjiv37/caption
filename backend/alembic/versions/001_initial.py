"""Initial database migration.

Revision ID: 001
Revises:
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create users table
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("email", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=True),
        sa.Column("organization", sa.String(255), nullable=True),
        sa.Column("role", sa.String(50), server_default="user", nullable=False),
        sa.Column("credits_remaining", sa.Integer, server_default="0"),
        sa.Column("credits_total", sa.Integer, server_default="0"),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )

    # Create languages table
    op.create_table(
        "languages",
        sa.Column("code", sa.String(10), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("native_name", sa.String(100), nullable=True),
    )
    languages_table = sa.table(
        "languages",
        sa.column("code", sa.String(10)),
        sa.column("name", sa.String(100)),
        sa.column("native_name", sa.String(100)),
    )

    # Insert default languages
    op.bulk_insert(
        languages_table,
        [
            {"code": "en", "name": "English", "native_name": "English"},
            {"code": "es", "name": "Spanish", "native_name": "Español"},
            {"code": "fr", "name": "French", "native_name": "Français"},
            {"code": "de", "name": "German", "native_name": "Deutsch"},
            {"code": "it", "name": "Italian", "native_name": "Italiano"},
            {"code": "pt", "name": "Portuguese", "native_name": "Português"},
            {"code": "ru", "name": "Russian", "native_name": "Русский"},
            {"code": "ja", "name": "Japanese", "native_name": "日本語"},
            {"code": "ko", "name": "Korean", "native_name": "한국어"},
            {"code": "zh", "name": "Chinese", "native_name": "中文"},
            {"code": "ar", "name": "Arabic", "native_name": "العربية"},
            {"code": "hi", "name": "Hindi", "native_name": "हिन्दी"},
        ],
    )

    # Create series table
    op.create_table(
        "series",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("hue", sa.Integer, server_default="265"),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("is_archived", sa.Boolean, server_default="false"),
        sa.Column("is_deleted", sa.Boolean, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )

    # Create series_languages table
    op.create_table(
        "series_languages",
        sa.Column("series_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("series.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("language_code", sa.String(10), sa.ForeignKey("languages.code"), primary_key=True),
    )

    # Create series_speakers table
    op.create_table(
        "series_speakers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("series_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("series.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("meta", sa.String(255), nullable=True),
        sa.Column("hue", sa.Integer, server_default="265"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )

    # Create series_terms table
    op.create_table(
        "series_terms",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("series_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("series.id", ondelete="CASCADE"), nullable=False),
        sa.Column("term", sa.String(255), nullable=False),
        sa.Column("rule", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )

    # Create projects table
    op.create_table(
        "projects",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("initial", sa.String(1), nullable=False),
        sa.Column("tile", sa.Integer, server_default="0"),
        sa.Column("duration_seconds", sa.Integer, nullable=True),
        sa.Column("duration_display", sa.String(20), nullable=True),
        sa.Column("status", sa.String(50), server_default="transcribed"),
        sa.Column("role", sa.String(50), server_default="owner"),
        sa.Column("source_language", sa.String(10), server_default="en"),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("series_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("series.id", ondelete="SET NULL"), nullable=True),
        sa.Column("is_archived", sa.Boolean, server_default="false"),
        sa.Column("is_deleted", sa.Boolean, server_default="false"),
        sa.Column("is_favorite", sa.Boolean, server_default="false"),
        sa.Column("storage_key", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )

    # Create episodes table
    op.create_table(
        "episodes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("series_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("series.id", ondelete="CASCADE"), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("meta", sa.String(255), nullable=True),
        sa.Column("status", sa.String(50), server_default="transcribed"),
        sa.Column("sort_order", sa.Integer, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )

    # Create speakers table (per project)
    op.create_table(
        "speakers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("hue", sa.Integer, server_default="265"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )

    # Create segments table
    op.create_table(
        "segments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("speaker_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("speakers.id", ondelete="SET NULL"), nullable=True),
        sa.Column("start_time", sa.Float, nullable=False),
        sa.Column("end_time", sa.Float, nullable=False),
        sa.Column("sort_order", sa.Integer, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )

    # Create segment_texts table
    op.create_table(
        "segment_texts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("segment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("segments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("language_code", sa.String(10), nullable=False),
        sa.Column("text", sa.Text, nullable=False, server_default=""),
        sa.Column("is_machine_translated", sa.Boolean, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.UniqueConstraint("segment_id", "language_code", name="uq_segment_language"),
    )

    # Create project_shares table
    op.create_table(
        "project_shares",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(50), server_default="view"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.UniqueConstraint("project_id", "user_id", name="uq_project_share"),
    )

    # Create assets table
    op.create_table(
        "assets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("path", sa.String(500), nullable=False, server_default=""),
        sa.Column("storage_key", sa.String(500), nullable=False),
        sa.Column("file_size", sa.BigInteger, nullable=True),
        sa.Column("mime_type", sa.String(100), nullable=True),
        sa.Column("kind", sa.String(50), nullable=True),
        sa.Column("duration_seconds", sa.BigInteger, nullable=True),
        sa.Column("is_flagged", sa.Boolean, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )

    # Create indexes
    op.create_index("ix_projects_owner_id", "projects", ["owner_id"])
    op.create_index("ix_projects_series_id", "projects", ["series_id"])
    op.create_index("ix_projects_status", "projects", ["status"])
    op.create_index("ix_segments_project_id", "segments", ["project_id"])
    op.create_index("ix_assets_owner_id", "assets", ["owner_id"])


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table("assets")
    op.drop_table("project_shares")
    op.drop_table("segment_texts")
    op.drop_table("segments")
    op.drop_table("speakers")
    op.drop_table("episodes")
    op.drop_table("projects")
    op.drop_table("series_terms")
    op.drop_table("series_speakers")
    op.drop_table("series_languages")
    op.drop_table("series")
    op.drop_table("languages")
    op.drop_table("users")
