"""Add job tracking fields to projects.

Revision ID: 002
Revises: 001
Create Date: 2026-07-20 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add job tracking columns to projects table
    op.add_column(
        "projects",
        sa.Column("job_id", sa.String(100), nullable=True),
    )
    op.add_column(
        "projects",
        sa.Column("job_status", sa.String(50), server_default="pending", nullable=False),
    )
    op.add_column(
        "projects",
        sa.Column("job_progress", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "projects",
        sa.Column("job_message", sa.Text(), nullable=True),
    )
    op.add_column(
        "projects",
        sa.Column("transcription_result", sa.JSON(), nullable=True),
    )

    # Create index on job_status for faster filtering
    op.create_index("ix_projects_job_status", "projects", ["job_status"])


def downgrade() -> None:
    op.drop_index("ix_projects_job_status", table_name="projects")

    op.drop_column("projects", "transcription_result")
    op.drop_column("projects", "job_message")
    op.drop_column("projects", "job_progress")
    op.drop_column("projects", "job_status")
    op.drop_column("projects", "job_id")
