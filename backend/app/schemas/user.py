"""
User schemas — profile output, update, and search.
"""

from datetime import datetime

from pydantic import BaseModel, Field


class UserOut(BaseModel):
    id: str
    username: str
    display_name: str
    phone_number: str | None = None
    avatar_url: str | None = None
    is_online: bool = False
    last_seen_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    display_name: str | None = Field(None, min_length=1, max_length=100)
    avatar_url: str | None = None
    phone_number: str | None = Field(None, max_length=20)
