"""Transcription tasks using Celery."""
from celery_worker import celery_app


@celery_app.task(bind=True)
def transcribe_video(self, project_id: str, language: str = "en"):
    """Transcribe a video using Whisper.

    Args:
        project_id: The project ID to transcribe
        language: Source language code

    Returns:
        dict: Transcription result with segment count
    """
    # TODO: Implement actual transcription
    # This is a placeholder for Phase 1

    self.update_state(
        state="PROGRESS",
        meta={"progress": 0, "status": "Starting transcription..."},
    )

    # Placeholder implementation
    return {
        "project_id": project_id,
        "language": language,
        "segments_created": 0,
        "status": "completed",
    }


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
