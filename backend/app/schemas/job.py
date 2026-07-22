"""Job schemas."""
from typing import Optional

from pydantic import BaseModel


class JobStatusResponse(BaseModel):
    """Response schema for job status."""

    job_id: Optional[str] = None
    status: str  # pending, uploading, transcribing, completed, failed
    progress: int
    message: Optional[str] = None
    result: Optional[dict] = None
