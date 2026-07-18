"""User schemas."""
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, ConfigDict


class UserBase(BaseModel):
    """Base user schema."""
    email: EmailStr
    full_name: Optional[str] = None
    organization: Optional[str] = None


class UserCreate(UserBase):
    """Schema for creating a new user."""
    password: str


class UserUpdate(BaseModel):
    """Schema for updating a user."""
    full_name: Optional[str] = None
    organization: Optional[str] = None


class UserResponse(UserBase):
    """Schema for user response."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    role: str
    credits_remaining: int
    credits_total: int
    is_active: bool
    created_at: datetime


class UserInDB(UserBase):
    """Schema for user with hashed password (internal use)."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    hashed_password: str
    role: str
    credits_remaining: int
    credits_total: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
