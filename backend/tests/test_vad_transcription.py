"""Tests for VAD-based transcription path (fully mocked; no live DB/torch)."""
import base64
import sys
import types
import uuid
from unittest.mock import MagicMock, patch

import pytest

from app.tasks.transcribe import (
    _create_segments_from_vad_regions,
    _extract_region_wav_b64,
    _run_transcription_2,
)


# ---------------------------------------------------------------------------
# run_vad
# ---------------------------------------------------------------------------


def _install_fake_torch(hub_load):
    """Install a minimal fake torch module so run_vad can import it."""
    fake_torch = types.ModuleType("torch")
    fake_torch.hub = types.SimpleNamespace(load=hub_load)
    fake_torch.cuda = types.SimpleNamespace(
        is_available=lambda: False,
        empty_cache=lambda: None,
    )
    sys.modules["torch"] = fake_torch
    return fake_torch


def test_run_vad_maps_sample_indices_to_seconds():
    from app.utils import vad as vad_mod

    fake_model = object()
    fake_wav = object()

    def fake_get_speech_timestamps(*_args, **_kwargs):
        return [
            {"start": 8000, "end": 24000},
            {"start": 32000, "end": 48000},
        ]

    fake_utils = (fake_get_speech_timestamps, None, lambda *_a, **_k: fake_wav)

    def hub_load(*_args, **_kwargs):
        return fake_model, fake_utils

    _install_fake_torch(hub_load)
    try:
        with patch.object(vad_mod, "load_audio", return_value=fake_wav):
            regions = vad_mod.run_vad("/tmp/fake.wav", {})
    finally:
        sys.modules.pop("torch", None)

    assert regions == [
        {"start": 0.5, "end": 1.5},
        {"start": 2.0, "end": 3.0},
    ]


def test_run_vad_uses_cfg_thresholds():
    from app.utils import vad as vad_mod

    captured = {}

    def fake_get_speech_timestamps(*_args, **kwargs):
        captured.update(kwargs)
        return []

    fake_utils = (fake_get_speech_timestamps, None, lambda *_a, **_k: object())

    def hub_load(*_args, **_kwargs):
        return object(), fake_utils

    _install_fake_torch(hub_load)
    try:
        with patch.object(vad_mod, "load_audio", return_value=object()):
            vad_mod.run_vad(
                "/tmp/fake.wav",
                {
                    "vad_onset": 0.5,
                    "vad_offset": 0.3,
                    "min_speech_ms": 100,
                    "min_silence_ms": 200,
                },
            )
    finally:
        sys.modules.pop("torch", None)

    assert captured["threshold"] == 0.5
    assert captured["neg_threshold"] == 0.3
    assert captured["min_speech_duration_ms"] == 100
    assert captured["min_silence_duration_ms"] == 200
    assert captured["sampling_rate"] == 16000


def test_run_vad_defaults_when_cfg_empty():
    from app.utils import vad as vad_mod

    captured = {}

    def fake_get_speech_timestamps(*_args, **kwargs):
        captured.update(kwargs)
        return []

    fake_utils = (fake_get_speech_timestamps, None, lambda *_a, **_k: object())
    _install_fake_torch(lambda *_a, **_k: (object(), fake_utils))
    try:
        with patch.object(vad_mod, "load_audio", return_value=object()):
            vad_mod.run_vad("/tmp/fake.wav", {})
    finally:
        sys.modules.pop("torch", None)

    assert captured["threshold"] == 0.35
    assert captured["neg_threshold"] == 0.2
    assert captured["min_speech_duration_ms"] == 250
    assert captured["min_silence_duration_ms"] == 300


# ---------------------------------------------------------------------------
# _extract_region_wav_b64
# ---------------------------------------------------------------------------


def test_extract_region_wav_b64_calls_ffmpeg_and_encodes():
    fake_wav = b"RIFF....WAVEfmt "
    completed = MagicMock()
    completed.stdout = fake_wav

    with patch("app.tasks.transcribe.subprocess.run", return_value=completed) as mock_run:
        b64 = _extract_region_wav_b64("/tmp/full.wav", 1.25, 3.75)

    assert b64 == base64.b64encode(fake_wav).decode("utf-8")
    cmd = mock_run.call_args[0][0]
    assert cmd[0] == "ffmpeg"
    assert "-ss" in cmd and "1.25" in cmd
    assert "-t" in cmd and "2.5" in cmd
    assert "/tmp/full.wav" in cmd
    assert cmd[-1] == "-"


# ---------------------------------------------------------------------------
# _create_segments_from_vad_regions
# ---------------------------------------------------------------------------


def test_create_segments_from_vad_regions():
    project_id = str(uuid.uuid4())
    transcript_id = uuid.uuid4()

    project = MagicMock()
    project.status = "draft"
    transcript = MagicMock()
    transcript.id = transcript_id
    transcript.status = "draft"

    added = []
    deleted = []

    existing_result = MagicMock()
    existing_result.scalars.return_value.all.return_value = [
        MagicMock(name="old_seg"),
    ]

    session = MagicMock()
    session.execute.return_value = existing_result
    session.delete.side_effect = lambda s: deleted.append(s)
    session.add = lambda seg: added.append(seg)

    regions = [
        {"start": 0.5, "end": 1.8},
        {"start": 2.0, "end": 3.5},
        {"start": 4.0, "end": 5.0},
    ]
    asr_result = {
        "success": True,
        "results": [
            {"text": "Hello there."},
            {"text": "  "},
            {"text": "Final line."},
        ],
    }

    with (
        patch("app.tasks.transcribe._get_project", return_value=project),
        patch(
            "app.tasks.transcribe._get_or_create_original_transcript",
            return_value=transcript,
        ),
    ):
        count = _create_segments_from_vad_regions(
            session, project_id, "en", regions, asr_result
        )

    assert count == 2
    assert len(deleted) == 1
    assert len(added) == 2
    assert added[0].text == "Hello there."
    assert added[0].start_time == 0.5
    assert added[0].end_time == 1.8
    assert added[0].sort_order == 0
    assert added[1].text == "Final line."
    assert added[1].start_time == 4.0
    assert added[1].end_time == 5.0
    assert added[1].sort_order == 1
    assert project.status == "transcribed"
    assert transcript.status == "completed"
    session.commit.assert_called()


def test_create_segments_from_vad_empty_results():
    session = MagicMock()

    with patch("app.tasks.transcribe._get_project", return_value=MagicMock()):
        count = _create_segments_from_vad_regions(
            session,
            str(uuid.uuid4()),
            "en",
            [{"start": 0.0, "end": 1.0}],
            {"success": True, "results": []},
        )

    assert count == 0
    session.commit.assert_not_called()


def test_create_segments_from_vad_missing_project():
    session = MagicMock()
    with patch("app.tasks.transcribe._get_project", return_value=None):
        count = _create_segments_from_vad_regions(
            session,
            str(uuid.uuid4()),
            "en",
            [{"start": 0.0, "end": 1.0}],
            {"success": True, "results": [{"text": "x"}]},
        )
    assert count == 0


# ---------------------------------------------------------------------------
# _run_transcription_2
# ---------------------------------------------------------------------------


def test_run_transcription_2_happy_path():
    regions = [{"start": 0.0, "end": 1.0}, {"start": 2.0, "end": 3.5}]
    asr_payload = {
        "success": True,
        "results": [{"text": "First."}, {"text": "Second."}],
    }

    ffmpeg_full = MagicMock()
    ffmpeg_full.stdout = b"FULLWAV"

    mock_session = MagicMock()
    mock_session_cm = MagicMock()
    mock_session_cm.__enter__.return_value = mock_session
    mock_session_cm.__exit__.return_value = None

    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()
    mock_response.json.return_value = asr_payload
    mock_client = MagicMock()
    mock_client.__enter__.return_value = mock_client
    mock_client.__exit__.return_value = None
    mock_client.post.return_value = mock_response

    with (
        patch("app.tasks.transcribe.SessionLocal", return_value=mock_session_cm),
        patch("app.tasks.transcribe._update_project_job") as mock_job,
        patch("app.tasks.transcribe.subprocess.run", return_value=ffmpeg_full),
        patch("app.tasks.transcribe.run_vad", return_value=regions),
        patch(
            "app.tasks.transcribe._extract_region_wav_b64",
            side_effect=["b64a", "b64b"],
        ) as mock_extract,
        patch("app.tasks.transcribe.httpx.Client", return_value=mock_client),
        patch(
            "app.tasks.transcribe._create_segments_from_vad_regions",
            return_value=2,
        ) as mock_create,
        patch("app.tasks.transcribe.os.unlink"),
        patch("app.tasks.transcribe.os.path.exists", return_value=True),
    ):
        out = _run_transcription_2(
            job_id="job-1",
            project_id=str(uuid.uuid4()),
            file_path="/tmp/video.mp4",
            language="en",
            context="show context",
        )

    assert out["status"] == "completed"
    assert out["segments_created"] == 2
    assert mock_extract.call_count == 2
    mock_create.assert_called_once()
    body = mock_client.post.call_args[1]["json"]
    assert body["return_time_stamps"] is False
    assert len(body["items"]) == 2
    assert body["items"][0]["audio_b64"] == "b64a"
    assert body["items"][0]["context"] == "show context"
    assert body["items"][1]["audio_b64"] == "b64b"

    job_messages = [c.args[4] for c in mock_job.call_args_list if len(c.args) > 4]
    assert "Reading audio file..." in job_messages
    assert "Detecting speech regions..." in job_messages
    assert "Transcribing audio..." in job_messages
    assert "Creating caption segments..." in job_messages
    assert "Transcription completed" in job_messages


def test_run_transcription_2_no_vad_regions():
    ffmpeg_full = MagicMock()
    ffmpeg_full.stdout = b"FULLWAV"

    mock_session = MagicMock()
    mock_session_cm = MagicMock()
    mock_session_cm.__enter__.return_value = mock_session
    mock_session_cm.__exit__.return_value = None

    with (
        patch("app.tasks.transcribe.SessionLocal", return_value=mock_session_cm),
        patch("app.tasks.transcribe._update_project_job") as mock_job,
        patch("app.tasks.transcribe.subprocess.run", return_value=ffmpeg_full),
        patch("app.tasks.transcribe.run_vad", return_value=[]),
        patch("app.tasks.transcribe.httpx.Client") as mock_httpx,
        patch("app.tasks.transcribe.os.unlink"),
        patch("app.tasks.transcribe.os.path.exists", return_value=True),
    ):
        out = _run_transcription_2(
            job_id="job-2",
            project_id=str(uuid.uuid4()),
            file_path="/tmp/video.mp4",
            language="en",
            context=None,
        )

    assert out["status"] == "completed"
    assert out["segments_created"] == 0
    mock_httpx.assert_not_called()
    final_call = mock_job.call_args_list[-1]
    assert final_call.args[2] == "completed"
    assert "No speech regions detected" in final_call.args[4]


def test_run_transcription_2_filters_short_regions_and_omits_context():
    regions = [
        {"start": 0.0, "end": 0.04},
        {"start": 1.0, "end": 2.0},
    ]
    asr_payload = {"success": True, "results": [{"text": "Only one."}]}

    ffmpeg_full = MagicMock()
    ffmpeg_full.stdout = b"FULLWAV"

    mock_session = MagicMock()
    mock_session_cm = MagicMock()
    mock_session_cm.__enter__.return_value = mock_session
    mock_session_cm.__exit__.return_value = None

    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()
    mock_response.json.return_value = asr_payload
    mock_client = MagicMock()
    mock_client.__enter__.return_value = mock_client
    mock_client.__exit__.return_value = None
    mock_client.post.return_value = mock_response

    with (
        patch("app.tasks.transcribe.SessionLocal", return_value=mock_session_cm),
        patch("app.tasks.transcribe._update_project_job"),
        patch("app.tasks.transcribe.subprocess.run", return_value=ffmpeg_full),
        patch("app.tasks.transcribe.run_vad", return_value=regions),
        patch("app.tasks.transcribe._extract_region_wav_b64", return_value="clip"),
        patch("app.tasks.transcribe.httpx.Client", return_value=mock_client),
        patch(
            "app.tasks.transcribe._create_segments_from_vad_regions",
            return_value=1,
        ) as mock_create,
        patch("app.tasks.transcribe.os.unlink"),
        patch("app.tasks.transcribe.os.path.exists", return_value=True),
    ):
        out = _run_transcription_2(
            job_id="job-3",
            project_id=str(uuid.uuid4()),
            file_path="/tmp/video.mp4",
            language="hi",
            context=None,
        )

    assert out["segments_created"] == 1
    body = mock_client.post.call_args[1]["json"]
    assert len(body["items"]) == 1
    assert "context" not in body["items"][0]
    passed_regions = mock_create.call_args.args[3]
    assert passed_regions == [{"start": 1.0, "end": 2.0}]


def test_run_transcription_2_asr_failure_marks_job_failed():
    ffmpeg_full = MagicMock()
    ffmpeg_full.stdout = b"FULLWAV"

    mock_session = MagicMock()
    mock_session_cm = MagicMock()
    mock_session_cm.__enter__.return_value = mock_session
    mock_session_cm.__exit__.return_value = None

    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()
    mock_response.json.return_value = {"success": False, "error": "boom"}
    mock_client = MagicMock()
    mock_client.__enter__.return_value = mock_client
    mock_client.__exit__.return_value = None
    mock_client.post.return_value = mock_response

    with (
        patch("app.tasks.transcribe.SessionLocal", return_value=mock_session_cm),
        patch("app.tasks.transcribe._update_project_job") as mock_job,
        patch("app.tasks.transcribe.subprocess.run", return_value=ffmpeg_full),
        patch(
            "app.tasks.transcribe.run_vad",
            return_value=[{"start": 0.0, "end": 1.0}],
        ),
        patch("app.tasks.transcribe._extract_region_wav_b64", return_value="clip"),
        patch("app.tasks.transcribe.httpx.Client", return_value=mock_client),
        patch("app.tasks.transcribe.os.unlink"),
        patch("app.tasks.transcribe.os.path.exists", return_value=True),
    ):
        with pytest.raises(ValueError, match="unsuccessful"):
            _run_transcription_2(
                job_id="job-4",
                project_id=str(uuid.uuid4()),
                file_path="/tmp/video.mp4",
                language="en",
                context=None,
            )

    failed = mock_job.call_args_list[-1]
    assert failed.args[2] == "failed"
    assert "Transcription failed" in failed.args[4]


def test_transcribe_video_calls_run_transcription_2():
    from app.tasks import transcribe as tx

    with patch.object(
        tx,
        "_run_transcription_2",
        return_value={"status": "completed", "segments_created": 1},
    ) as mock_fn:
        result = tx.transcribe_video.run(
            job_id="j",
            project_id=str(uuid.uuid4()),
            file_path="/tmp/v.mp4",
            language="en",
            context=None,
        )

    assert result["status"] == "completed"
    mock_fn.assert_called_once()
