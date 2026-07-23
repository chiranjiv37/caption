"""Transcription tasks using Celery."""
import base64
import os
import tempfile
import uuid
from typing import List, Optional
import subprocess

import httpx
from celery_worker import celery_app
from sqlalchemy import select

from app.database import SessionLocal
from app.models.project import Project
from app.models.segment import Segment
from app.models.series import Language
from app.models.transcript import Transcript
from app.utils.vad import run_vad


ASR_API_URL = "http://10.10.0.1:9200/v1/qwen-asr/transcribe_batch"


def _get_project(session, project_id: str) -> Optional[Project]:
    """Get project by ID."""
    result = session.execute(
        select(Project).where(Project.id == uuid.UUID(project_id))
    )
    return result.scalar_one_or_none()


def _ensure_language(session, language_code: str) -> None:
    """Ensure language_code exists in languages table (FK for transcripts)."""
    result = session.execute(
        select(Language).where(Language.code == language_code)
    )
    if result.scalar_one_or_none():
        return
    session.add(
        Language(
            code=language_code,
            name=language_code,
            native_name=language_code,
        )
    )
    session.flush()


def _get_or_create_original_transcript(
    session,
    project_id: uuid.UUID,
    language: str,
) -> Transcript:
    """Get or create the original transcript for a project/language."""
    _ensure_language(session, language)

    result = session.execute(
        select(Transcript).where(
            Transcript.project_id == project_id,
            Transcript.language_code == language,
            Transcript.type == "original",
            Transcript.version == 1,
        )
    )
    transcript = result.scalar_one_or_none()
    if transcript:
        return transcript

    transcript = Transcript(
        project_id=project_id,
        language_code=language,
        type="original",
        parent_transcript_id=None,
        status="draft",
        version=1,
    )
    session.add(transcript)
    session.flush()
    return transcript


def _update_project_job(
    session,
    project_id: str,
    status: str,
    progress: int,
    message: Optional[str] = None,
    result: Optional[dict] = None,
) -> None:
    """Update project job status."""
    project = _get_project(session, project_id)
    if not project:
        return

    project.job_status = status
    project.job_progress = progress
    if message is not None:
        project.job_message = message
    if result is not None:
        project.transcription_result = result

    session.commit()


def _create_segments_from_result(
    session,
    project_id: str,
    language: str,
    asr_result: dict,
) -> int:
    """Create original transcript + segments from ASR result.

    Returns number of segments created.
    """
    project = _get_project(session, project_id)
    if not project:
        return 0

    results = asr_result.get("results", [])
    if not results:
        return 0

    item = results[0]
    text = item.get("text", "")
    words = item.get("words", [])

    transcript = _get_or_create_original_transcript(
        session,
        uuid.UUID(project_id),
        language,
    )

    # Replace existing segments on re-transcription of the same original transcript
    existing = session.execute(
        select(Segment).where(Segment.transcript_id == transcript.id)
    )
    for old_segment in existing.scalars().all():
        session.delete(old_segment)
    session.flush()

    segments_created = 0

    def _add_segment(
        start: float,
        end: float,
        segment_text: str,
        sort_order: int,
    ) -> Segment:
        return Segment(
            transcript_id=transcript.id,
            start_time=start,
            end_time=end,
            sort_order=sort_order,
            text=segment_text,
        )

    if words:
        current_text_parts = []
        current_start = None
        current_end = None
        sort_order = 0

        for word_info in words:
            word_text = word_info.get("text", "")
            word_start = word_info.get("start")
            word_end = word_info.get("end")

            if word_start is None or word_end is None:
                continue

            if current_start is None:
                current_start = word_start

            current_text_parts.append(word_text)
            current_end = word_end

            segment_text = " ".join(current_text_parts).strip()
            should_break = (
                segment_text.endswith((".", "!", "?")) or
                len(current_text_parts) >= 10
            )

            if should_break and segment_text:
                session.add(
                    _add_segment(
                        current_start,
                        current_end,
                        segment_text,
                        sort_order,
                    )
                )
                segments_created += 1
                sort_order += 1
                current_text_parts = []
                current_start = None
                current_end = None

        if current_text_parts:
            segment_text = " ".join(current_text_parts).strip()
            if segment_text and current_start is not None and current_end is not None:
                session.add(
                    _add_segment(
                        current_start,
                        current_end,
                        segment_text,
                        sort_order,
                    )
                )
                segments_created += 1
    elif text:
        session.add(_add_segment(0.0, 0.0, text.strip(), 0))
        segments_created = 1

    if segments_created > 0:
        project.status = "transcribed"
        transcript.status = "completed"

    session.commit()
    return segments_created


def _create_segments_from_vad_regions(
    session,
    project_id: str,
    language: str,
    regions: List[dict],
    asr_result: dict,
) -> int:
    """Create original transcript + segments from VAD regions + ASR texts.

    One non-empty ASR result maps to one segment using the region's absolute
    start/end. Does not call ``_create_segments_from_result``.

    Returns number of segments created.
    """
    project = _get_project(session, project_id)
    if not project:
        return 0

    results = asr_result.get("results", [])
    if not results:
        return 0

    transcript = _get_or_create_original_transcript(
        session,
        uuid.UUID(project_id),
        language,
    )

    existing = session.execute(
        select(Segment).where(Segment.transcript_id == transcript.id)
    )
    for old_segment in existing.scalars().all():
        session.delete(old_segment)
    session.flush()

    segments_created = 0
    sort_order = 0
    for region, item in zip(regions, results):
        text = (item.get("text") or "").strip()
        if not text:
            continue
        session.add(
            Segment(
                transcript_id=transcript.id,
                start_time=float(region["start"]),
                end_time=float(region["end"]),
                sort_order=sort_order,
                text=text,
            )
        )
        segments_created += 1
        sort_order += 1

    if segments_created > 0:
        project.status = "transcribed"
        transcript.status = "completed"

    session.commit()
    return segments_created


def _run_transcription(
    job_id: str,
    project_id: str,
    file_path: str,
    language: str,
    context: Optional[str],
) -> dict:
    """Sync transcription workflow (legacy word-timestamp path)."""
    with SessionLocal() as session:
        try:
            _update_project_job(
                session, project_id, "transcribing", 10,
                "Reading audio file..."
            )

            result = subprocess.run(
                [
                    "ffmpeg",
                    "-i", file_path,
                    "-vn",
                    "-ac", "1",
                    "-ar", "16000",
                    "-f", "wav",
                    "-"
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                check=True,
            )

            wav_bytes = result.stdout
            audio_b64 = base64.b64encode(wav_bytes).decode("utf-8")

            payload = {
                "items": [{
                    "audio_b64": audio_b64,
                    "audio_format": "wav",
                    "language": language,
                    "context": context,
                }],
                "return_time_stamps": True,
            }

            if not context:
                del payload["items"][0]["context"]

            _update_project_job(
                session, project_id, "transcribing", 30,
                "Transcribing audio..."
            )

            with httpx.Client(timeout=300) as client:
                response = client.post(ASR_API_URL, json=payload)
                response.raise_for_status()
                asr_result = response.json()

            if not asr_result.get("success", False):
                raise ValueError(
                    f"ASR API returned unsuccessful response: {asr_result}"
                )

            _update_project_job(
                session, project_id, "transcribing", 80,
                "Creating caption segments..."
            )

            segments_created = _create_segments_from_result(
                session, project_id, language, asr_result
            )

            _update_project_job(
                session, project_id, "completed", 100,
                "Transcription completed",
                result=asr_result,
            )

            return {
                "job_id": job_id,
                "project_id": project_id,
                "status": "completed",
                "segments_created": segments_created,
            }

        except Exception as exc:
            _update_project_job(
                session, project_id, "failed", 0,
                f"Transcription failed: {str(exc)}"
            )
            raise


def _extract_region_wav_b64(wav_path: str, start: float, end: float) -> str:
    """Extract a mono 16kHz WAV clip for [start, end) and return base64."""
    duration = max(0.0, end - start)
    result = subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-loglevel", "error",
            "-ss", str(start),
            "-i", wav_path,
            "-t", str(duration),
            "-vn",
            "-ac", "1",
            "-ar", "16000",
            "-f", "wav",
            "-",
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=True,
    )
    return base64.b64encode(result.stdout).decode("utf-8")


def _run_transcription_2(
    job_id: str,
    project_id: str,
    file_path: str,
    language: str,
    context: Optional[str],
) -> dict:
    """Sync transcription via Silero VAD regions + Qwen ASR (no timestamps)."""
    with SessionLocal() as session:
        temp_wav_path = None
        try:
            _update_project_job(
                session, project_id, "transcribing", 10,
                "Reading audio file..."
            )

            result = subprocess.run(
                [
                    "ffmpeg",
                    "-i", file_path,
                    "-vn",
                    "-ac", "1",
                    "-ar", "16000",
                    "-f", "wav",
                    "-",
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                check=True,
            )
            wav_bytes = result.stdout

            with tempfile.NamedTemporaryFile(
                suffix=".wav", delete=False
            ) as tmp:
                tmp.write(wav_bytes)
                temp_wav_path = tmp.name

            _update_project_job(
                session, project_id, "transcribing", 20,
                "Detecting speech regions..."
            )

            regions = [
                r for r in run_vad(temp_wav_path, {})
                if r["end"] - r["start"] > 0.05
            ]

            if not regions:
                _update_project_job(
                    session, project_id, "completed", 100,
                    "No speech regions detected",
                    result={"success": True, "results": []},
                )
                return {
                    "job_id": job_id,
                    "project_id": project_id,
                    "status": "completed",
                    "segments_created": 0,
                }

            items = []
            for region in regions:
                item = {
                    "audio_b64": _extract_region_wav_b64(
                        temp_wav_path,
                        region["start"],
                        region["end"],
                    ),
                    "audio_format": "wav",
                    "language": language,
                }
                if context:
                    item["context"] = context
                items.append(item)

            payload = {
                "items": items,
                "return_time_stamps": False,
            }

            _update_project_job(
                session, project_id, "transcribing", 30,
                "Transcribing audio..."
            )

            with httpx.Client(timeout=300) as client:
                response = client.post(ASR_API_URL, json=payload)
                response.raise_for_status()
                asr_result = response.json()

            if not asr_result.get("success", False):
                raise ValueError(
                    f"ASR API returned unsuccessful response: {asr_result}"
                )

            _update_project_job(
                session, project_id, "transcribing", 80,
                "Creating caption segments..."
            )

            segments_created = _create_segments_from_vad_regions(
                session, project_id, language, regions, asr_result
            )

            _update_project_job(
                session, project_id, "completed", 100,
                "Transcription completed",
                result=asr_result,
            )

            return {
                "job_id": job_id,
                "project_id": project_id,
                "status": "completed",
                "segments_created": segments_created,
            }

        except Exception as exc:
            _update_project_job(
                session, project_id, "failed", 0,
                f"Transcription failed: {str(exc)}"
            )
            raise
        finally:
            if temp_wav_path and os.path.exists(temp_wav_path):
                os.unlink(temp_wav_path)


@celery_app.task(bind=True)
def transcribe_video(
    self,
    job_id: str,
    project_id: str,
    file_path: str,
    language: str = "en",
    context: Optional[str] = None,
):
    """Transcribe a video using the external ASR API.

    Args:
        job_id: The job ID for tracking
        project_id: The project ID to transcribe
        file_path: Path to the audio/video file on disk
        language: Source language code
        context: Optional context for transcription

    Returns:
        dict: Transcription result with segment count
    """
    try:
        return _run_transcription_2(
            job_id=job_id,
            project_id=project_id,
            file_path=file_path,
            language=language,
            context=context,
        )
    except Exception as exc:
        self.update_state(
            state="FAILURE",
            meta={"exc_type": type(exc).__name__, "exc_message": str(exc)},
        )
        raise


@celery_app.task(bind=True)
def diarize_speakers(self, project_id: str):
    """Run speaker diarization on a video.

    Args:
        project_id: The project ID to diarize

    Returns:
        dict: Diarization result with speaker count
    """
    # TODO: Implement speaker diarization
    return {
        "project_id": project_id,
        "speakers_detected": 0,
        "status": "completed",
    }
