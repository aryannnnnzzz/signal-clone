"""
Message schemas — create, output, status tracking.
"""

from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.user import UserOut


class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1)
    content_type: str = Field("text", pattern=r"^(text|image|file|system)$")
    reply_to_id: str | None = None


class MessageStatusOut(BaseModel):
    id: str
    user_id: str
    status: str
    timestamp: datetime

    model_config = {"from_attributes": True}


class MessageOut(BaseModel):
    id: str
    conversation_id: str
    sender_id: str | None = None
    sender: UserOut | None = None
    content_type: str
    content: str
    reply_to_id: str | None = None
    created_at: datetime
    statuses: list[MessageStatusOut] = []

    model_config = {"from_attributes": True}


class MarkReadRequest(BaseModel):
    message_id: str | None = None  # Optional — marks up to this message


class MessageStatusUpdate(BaseModel):
    message_ids: list[str] = Field(..., min_length=1)
    status: str = Field(..., pattern=r"^(delivered|read)$")
