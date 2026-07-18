"""Celery worker configuration."""
from celery import Celery

from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "captions_studio",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        "app.tasks.transcribe",
        "app.tasks.translate",
        "app.tasks.export_video",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # 1 hour
    worker_prefetch_multiplier=1,
)

if __name__ == "__main__":
    celery_app.start()
