"""Schemas package exports."""
from app.schemas.user import UserCreate, UserUpdate, UserResponse, UserInDB
from app.schemas.auth import (
    Token,
    TokenPayload,
    RefreshTokenRequest,
    LoginRequest,
    RegisterRequest,
)
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectListResponse,
    ProjectDetailResponse,
    ProjectStats,
    ProjectWithStats,
    ProjectDuplicateRequest,
    ProjectMoveRequest,
)
from app.schemas.series import (
    SeriesCreate,
    SeriesUpdate,
    SeriesListResponse,
    SeriesDetailResponse,
    SeriesSpeakerCreate,
    SeriesSpeakerResponse,
    SeriesTermCreate,
    SeriesTermResponse,
    EpisodeCreate,
    EpisodeResponse,
    SeriesReorderRequest,
    LanguageResponse,
)
from app.schemas.segment import (
    SegmentCreate,
    SegmentUpdate,
    SegmentResponse,
    SegmentTextCreate,
    SegmentTextResponse,
    SegmentBatchUpdateRequest,
    SegmentMergeRequest,
    SegmentSplitRequest,
)
from app.schemas.speaker import (
    SpeakerCreate,
    SpeakerUpdate,
    SpeakerResponse,
    SpeakerMergeRequest,
)
from app.schemas.asset import (
    AssetCreate,
    AssetUpdate,
    AssetResponse,
    AssetUploadResponse,
    AssetFolderCreate,
    PresignedUrlRequest,
    PresignedUrlResponse,
)
from app.schemas.common import (
    PaginationParams,
    PaginatedResponse,
    MessageResponse,
    ErrorResponse,
)

__all__ = [
    # User
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "UserInDB",
    # Auth
    "Token",
    "TokenPayload",
    "RefreshTokenRequest",
    "LoginRequest",
    "RegisterRequest",
    # Project
    "ProjectCreate",
    "ProjectUpdate",
    "ProjectListResponse",
    "ProjectDetailResponse",
    "ProjectStats",
    "ProjectWithStats",
    "ProjectDuplicateRequest",
    "ProjectMoveRequest",
    # Series
    "SeriesCreate",
    "SeriesUpdate",
    "SeriesListResponse",
    "SeriesDetailResponse",
    "SeriesSpeakerCreate",
    "SeriesSpeakerResponse",
    "SeriesTermCreate",
    "SeriesTermResponse",
    "EpisodeCreate",
    "EpisodeResponse",
    "SeriesReorderRequest",
    "LanguageResponse",
    # Segment
    "SegmentCreate",
    "SegmentUpdate",
    "SegmentResponse",
    "SegmentTextCreate",
    "SegmentTextResponse",
    "SegmentBatchUpdateRequest",
    "SegmentMergeRequest",
    "SegmentSplitRequest",
    # Speaker
    "SpeakerCreate",
    "SpeakerUpdate",
    "SpeakerResponse",
    "SpeakerMergeRequest",
    # Asset
    "AssetCreate",
    "AssetUpdate",
    "AssetResponse",
    "AssetUploadResponse",
    "AssetFolderCreate",
    "PresignedUrlRequest",
    "PresignedUrlResponse",
    # Common
    "PaginationParams",
    "PaginatedResponse",
    "MessageResponse",
    "ErrorResponse",
]
