"""
Search API router — /api/search endpoints.
Handles global and conversation-specific message searching.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.message import MessageOut
from app.services import message_service

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("/messages", response_model=list[MessageOut])
async def search_messages(
    q: str = Query(..., min_length=1, description="Search query string"),
    conversation_id: str | None = Query(None, description="Optional conversation ID to filter by"),
    limit: int = Query(50, ge=1, le=100, description="Max number of results"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Search messages globally or within a specific conversation.
    Only returns messages from conversations the user is a member of.
    """
    messages = await message_service.search_messages(
        db=db,
        user_id=current_user.id,
        query=q,
        conversation_id=conversation_id,
        limit=limit,
    )
    return [MessageOut.model_validate(m) for m in messages]
