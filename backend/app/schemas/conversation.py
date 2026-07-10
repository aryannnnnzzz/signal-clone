"""
Conversation schemas — DM creation, group creation, output with metadata.
"""

from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.user import UserOut


class DMCreate(BaseModel):
    user_id: str = Field(..., min_length=1)


class GroupCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    member_ids: list[str] = Field(..., min_length=1)


class ConversationUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    avatar_url: str | None = None


class MemberAdd(BaseModel):
    user_id: str = Field(..., min_length=1)


class MemberOut(BaseModel):
    id: str
    user_id: str
    role: str
    joined_at: datetime
    last_read_at: datetime | None = None
    user: UserOut

    model_config = {"from_attributes": True}


class ConversationOut(BaseModel):
    id: str
    type: str
    group_name: str | None = None
    group_avatar_url: str | None = None
    created_by: str | None = None
    created_at: datetime
    updated_at: datetime
    members: list[MemberOut] = []

    model_config = {"from_attributes": True}


class ConversationListItem(BaseModel):
    """Conversation item for the sidebar list — includes last message and unread count."""
    id: str
    type: str
    group_name: str | None = None
    group_avatar_url: str | None = None
    created_at: datetime
    updated_at: datetime
    members: list[MemberOut] = []
    last_message: "MessageOut | None" = None
    unread_count: int = 0

    model_config = {"from_attributes": True}


# Avoid circular import
from app.schemas.message import MessageOut  # noqa: E402

ConversationListItem.model_rebuild()
