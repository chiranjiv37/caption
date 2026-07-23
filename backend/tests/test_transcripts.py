"""Tests for transcript-centric segment creation (mocked sync helpers)."""
import uuid
from unittest.mock import MagicMock, patch

from app.models.segment import Segment
from app.tasks.transcribe import _create_segments_from_result


def test_create_segments_from_asr_with_words():
    project_id = str(uuid.uuid4())
    transcript_id = uuid.uuid4()

    project = MagicMock()
    project.status = "draft"
    transcript = MagicMock()
    transcript.id = transcript_id
    transcript.status = "draft"

    added = []
    existing_result = MagicMock()
    existing_result.scalars.return_value.all.return_value = []

    session = MagicMock()
    session.execute.return_value = existing_result
    session.add = lambda seg: added.append(seg)

    asr_result = {
        "success": True,
        "results": [
            {
                "text": "Hello world. This is a test.",
                "words": [
                    {"text": "Hello", "start": 0.0, "end": 0.5},
                    {"text": "world.", "start": 0.5, "end": 1.0},
                    {"text": "This", "start": 1.0, "end": 1.2},
                    {"text": "is", "start": 1.2, "end": 1.4},
                    {"text": "a", "start": 1.4, "end": 1.5},
                    {"text": "test.", "start": 1.5, "end": 2.0},
                ],
            }
        ],
    }

    with (
        patch("app.tasks.transcribe._get_project", return_value=project),
        patch(
            "app.tasks.transcribe._get_or_create_original_transcript",
            return_value=transcript,
        ),
    ):
        count = _create_segments_from_result(
            session, project_id, "en", asr_result
        )

    assert count >= 1
    assert len(added) == count
    assert all(isinstance(s, Segment) or hasattr(s, "text") for s in added)
    assert all(s.text for s in added)
    assert project.status == "transcribed"
    assert transcript.status == "completed"
    session.commit.assert_called()


def test_create_segments_plain_text_fallback():
    project = MagicMock()
    project.status = "draft"
    transcript = MagicMock()
    transcript.id = uuid.uuid4()
    transcript.status = "draft"

    added = []
    existing_result = MagicMock()
    existing_result.scalars.return_value.all.return_value = []

    session = MagicMock()
    session.execute.return_value = existing_result
    session.add = lambda seg: added.append(seg)

    asr_result = {
        "success": True,
        "results": [{"text": "Plain caption without words.", "words": []}],
    }

    with (
        patch("app.tasks.transcribe._get_project", return_value=project),
        patch(
            "app.tasks.transcribe._get_or_create_original_transcript",
            return_value=transcript,
        ),
    ):
        count = _create_segments_from_result(
            session, str(uuid.uuid4()), "en", asr_result
        )

    assert count == 1
    assert len(added) == 1
    assert added[0].text == "Plain caption without words."
    assert added[0].start_time == 0.0
    assert added[0].end_time == 0.0
    assert project.status == "transcribed"
    assert transcript.status == "completed"
