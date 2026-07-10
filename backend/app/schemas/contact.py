"""
Contact schemas — create, output.
"""

from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.user import UserOut


class ContactCreate(BaseModel):
    contact_user_id: str = Field(..., min_length=1)
    nickname: str | None = Field(None, max_length=100)


class ContactOut(BaseModel):
    id: str
    owner_id: str
    contact_user_id: str
    nickname: str | None = None
    contact_user: UserOut
    created_at: datetime

    model_config = {"from_attributes": True}
