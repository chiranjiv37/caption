"""Transcription tasks using Celery."""
import asyncio
import base64
import uuid
from typing import Optional

import httpx
from celery_worker import celery_app

from app.database import AsyncSessionLocal
from app.models.project import Project
from app.models.segment import Segment, SegmentText


ASR_API_URL = "http://10.10.0.1:9200/v1/qwen-asr/transcribe_batch"


async def _get_project(session, project_id: str) -> Optional[Project]:
    """Get project by ID."""
    from sqlalchemy import select
    result = await session.execute(
        select(Project).where(Project.id == uuid.UUID(project_id))
    )
    return result.scalar_one_or_none()


async def _update_project_job(
    session,
    project_id: str,
    status: str,
    progress: int,
    message: Optional[str] = None,
    result: Optional[dict] = None,
) -> None:
    """Update project job status."""
    project = await _get_project(session, project_id)
    if not project:
        return

    project.job_status = status
    project.job_progress = progress
    if message is not None:
        project.job_message = message
    if result is not None:
        project.transcription_result = result

    await session.commit()


async def _create_segments_from_result(
    session,
    project_id: str,
    language: str,
    asr_result: dict,
) -> int:
    """Create segments from ASR result.

    Returns number of segments created.
    """
    from sqlalchemy import select

    project = await _get_project(session, project_id)
    if not project:
        return 0

    results = asr_result.get("results", [])
    if not results:
        return 0

    item = results[0]
    text = item.get("text", "")
    words = item.get("words", [])

    segments_created = 0

    if words:
        # Create segments from word-level timestamps
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

            # Break segment at sentence-ending punctuation or every ~10 words
            segment_text = " ".join(current_text_parts).strip()
            should_break = (
                segment_text.endswith((".", "!", "?")) or
                len(current_text_parts) >= 10
            )

            if should_break and segment_text:
                segment = Segment(
                    project_id=uuid.UUID(project_id),
                    start_time=current_start,
                    end_time=current_end,
                    sort_order=sort_order,
                )
                session.add(segment)
                await session.flush()

                segment_text_record = SegmentText(
                    segment_id=segment.id,
                    language_code=language,
                    text=segment_text,
                    is_machine_translated=False,
                )
                session.add(segment_text_record)

                segments_created += 1
                sort_order += 1
                current_text_parts = []
                current_start = None
                current_end = None

        # Add remaining words as final segment
        if current_text_parts:
            segment_text = " ".join(current_text_parts).strip()
            if segment_text and current_start is not None and current_end is not None:
                segment = Segment(
                    project_id=uuid.UUID(project_id),
                    start_time=current_start,
                    end_time=current_end,
                    sort_order=sort_order,
                )
                session.add(segment)
                await session.flush()

                segment_text_record = SegmentText(
                    segment_id=segment.id,
                    language_code=language,
                    text=segment_text,
                    is_machine_translated=False,
                )
                session.add(segment_text_record)
                segments_created += 1
    elif text:
        # No word timestamps, create a single segment
        segment = Segment(
            project_id=uuid.UUID(project_id),
            start_time=0.0,
            end_time=0.0,
            sort_order=0,
        )
        session.add(segment)
        await session.flush()

        segment_text_record = SegmentText(
            segment_id=segment.id,
            language_code=language,
            text=text.strip(),
            is_machine_translated=False,
        )
        session.add(segment_text_record)
        segments_created = 1

    if segments_created > 0:
        project.status = "transcribed"

    await session.commit()
    return segments_created


async def _run_transcription(
    job_id: str,
    project_id: str,
    file_path: str,
    language: str,
    context: Optional[str],
) -> dict:
    """Async transcription workflow."""
    async with AsyncSessionLocal() as session:
        try:
            await _update_project_job(
                session, project_id, "transcribing", 10,
                "Reading audio file..."
            )

            # Read file from disk and encode as base64
            with open(file_path, "rb") as f:
                file_data = f.read()
            audio_b64 = base64.b64encode(file_data).decode("utf-8")

            payload = {
                "items": [{
                    "audio_b64": audio_b64,
                    "audio_format": "wav",
                    "language": language,
                    "context": context,
                }],
                "return_time_stamps": True,
            }

            # Clean payload
            if not context:
                del payload["items"][0]["context"]

            await _update_project_job(
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

            await _update_project_job(
                session, project_id, "transcribing", 80,
                "Creating caption segments..."
            )

            segments_created = await _create_segments_from_result(
                session, project_id, language, asr_result
            )

            await _update_project_job(
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
            await _update_project_job(
                session, project_id, "failed", 0,
                f"Transcription failed: {str(exc)}"
            )
            raise


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
        return asyncio.run(_run_transcription(
            job_id=job_id,
            project_id=project_id,
            file_path=file_path,
            language=language,
            context=context,
        ))
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
    # This is a placeholder for Phase 1

    return {
        "project_id": project_id,
        "speakers_detected": 0,
        "status": "completed",
    }
