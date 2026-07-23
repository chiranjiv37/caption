"""Backfill transcripts from existing segments / segment_texts.

Revision ID: 004
Revises: 003
Create Date: 2026-07-22 00:01:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # Ensure every language code used by projects / segment_texts exists
    conn.execute(
        sa.text(
            """
            INSERT INTO languages (code, name, native_name)
            SELECT DISTINCT p.source_language, p.source_language, p.source_language
            FROM projects p
            WHERE p.source_language IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1 FROM languages l WHERE l.code = p.source_language
              )
            """
        )
    )
    conn.execute(
        sa.text(
            """
            INSERT INTO languages (code, name, native_name)
            SELECT DISTINCT st.language_code, st.language_code, st.language_code
            FROM segment_texts st
            WHERE st.language_code IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1 FROM languages l WHERE l.code = st.language_code
              )
            """
        )
    )

    # Projects that have segments but no original transcript yet
    projects = conn.execute(
        sa.text(
            """
            SELECT DISTINCT p.id, p.source_language
            FROM projects p
            INNER JOIN segments s ON s.project_id = p.id
            WHERE NOT EXISTS (
                SELECT 1 FROM transcripts t
                WHERE t.project_id = p.id
                  AND t.type = 'original'
                  AND t.version = 1
            )
            """
        )
    ).fetchall()

    for project_id, source_language in projects:
        lang = source_language or "en"

        original_id = conn.execute(
            sa.text(
                """
                INSERT INTO transcripts (
                    id, project_id, language_code, type,
                    parent_transcript_id, status, version,
                    created_at, updated_at
                )
                VALUES (
                    gen_random_uuid(), :project_id, :language_code, 'original',
                    NULL, 'completed', 1, NOW(), NOW()
                )
                RETURNING id
                """
            ),
            {"project_id": project_id, "language_code": lang},
        ).scalar_one()

        conn.execute(
            sa.text(
                """
                UPDATE segments
                SET transcript_id = :transcript_id
                WHERE project_id = :project_id
                  AND transcript_id IS NULL
                """
            ),
            {"transcript_id": original_id, "project_id": project_id},
        )

        # Prefer text matching source language
        conn.execute(
            sa.text(
                """
                UPDATE segments s
                SET text = st.text
                FROM segment_texts st
                WHERE st.segment_id = s.id
                  AND s.transcript_id = :transcript_id
                  AND st.language_code = :language_code
                """
            ),
            {"transcript_id": original_id, "language_code": lang},
        )

        # Fallback: non-machine-translated text when source lang row missing
        conn.execute(
            sa.text(
                """
                UPDATE segments s
                SET text = st.text
                FROM segment_texts st
                WHERE st.segment_id = s.id
                  AND s.transcript_id = :transcript_id
                  AND (s.text IS NULL OR s.text = '')
                  AND st.is_machine_translated = false
                """
            ),
            {"transcript_id": original_id},
        )

        # Fallback: any remaining text
        conn.execute(
            sa.text(
                """
                UPDATE segments s
                SET text = st.text
                FROM (
                    SELECT DISTINCT ON (segment_id) segment_id, text
                    FROM segment_texts
                    ORDER BY segment_id, created_at
                ) st
                WHERE st.segment_id = s.id
                  AND s.transcript_id = :transcript_id
                  AND (s.text IS NULL OR s.text = '')
                """
            ),
            {"transcript_id": original_id},
        )

        # Languages present in segment_texts besides the source language
        other_langs = conn.execute(
            sa.text(
                """
                SELECT DISTINCT st.language_code
                FROM segment_texts st
                INNER JOIN segments s ON s.id = st.segment_id
                WHERE s.transcript_id = :transcript_id
                  AND st.language_code <> :language_code
                """
            ),
            {"transcript_id": original_id, "language_code": lang},
        ).fetchall()

        for (other_lang,) in other_langs:
            translation_id = conn.execute(
                sa.text(
                    """
                    INSERT INTO transcripts (
                        id, project_id, language_code, type,
                        parent_transcript_id, status, version,
                        created_at, updated_at
                    )
                    VALUES (
                        gen_random_uuid(), :project_id, :language_code, 'translation',
                        :parent_id, 'completed', 1, NOW(), NOW()
                    )
                    RETURNING id
                    """
                ),
                {
                    "project_id": project_id,
                    "language_code": other_lang,
                    "parent_id": original_id,
                },
            ).scalar_one()

            conn.execute(
                sa.text(
                    """
                    INSERT INTO segments (
                        id, project_id, transcript_id, source_segment_id,
                        speaker_id, start_time, end_time, sort_order, text,
                        created_at, updated_at
                    )
                    SELECT
                        gen_random_uuid(),
                        s.project_id,
                        :translation_id,
                        s.id,
                        s.speaker_id,
                        s.start_time,
                        s.end_time,
                        s.sort_order,
                        COALESCE(st.text, ''),
                        NOW(),
                        NOW()
                    FROM segments s
                    LEFT JOIN segment_texts st
                      ON st.segment_id = s.id
                     AND st.language_code = :language_code
                    WHERE s.transcript_id = :original_id
                    """
                ),
                {
                    "translation_id": translation_id,
                    "language_code": other_lang,
                    "original_id": original_id,
                },
            )


def downgrade() -> None:
    # Best-effort reverse: remove translation segments/transcripts created by backfill,
    # clear transcript linkage on original segments. Does not restore segment_texts.
    conn = op.get_bind()

    conn.execute(
        sa.text(
            """
            DELETE FROM segments
            WHERE source_segment_id IS NOT NULL
            """
        )
    )
    conn.execute(
        sa.text(
            """
            DELETE FROM transcripts
            WHERE type = 'translation'
            """
        )
    )
    conn.execute(
        sa.text(
            """
            UPDATE segments SET transcript_id = NULL, text = ''
            """
        )
    )
    conn.execute(
        sa.text(
            """
            DELETE FROM transcripts
            WHERE type = 'original'
            """
        )
    )
