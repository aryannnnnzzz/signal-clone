"""
Messages API router — /api/conversations/{conv_id}/messages endpoints.
Handles sending messages, paginated history, and marking conversations as read.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.message import MessageCreate, MessageOut, MessageEditRequest
from app.services import conversation_service, message_service
from app.ws import events as ws_events
from app.ws.manager import manager

router = APIRouter(prefix="/api/conversations", tags=["messages"])


@router.get("/{conversation_id}/messages", response_model=list[MessageOut])
async def get_messages(
    conversation_id: str,
    before: datetime | None = Query(None, description="Cursor: fetch messages before this timestamp"),
    limit: int = Query(50, ge=1, le=100, description="Number of messages to fetch"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch paginated message history for a conversation (cursor-based)."""
    # Verify membership
    if not await conversation_service.is_member(db, conversation_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not a member"
        )

    messages = await message_service.get_messages(
        db=db,
        conversation_id=conversation_id,
        user_id=current_user.id,
        before=before,
        limit=limit,
    )
    return [MessageOut.model_validate(m) for m in messages]


@router.post("/{conversation_id}/messages", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
async def send_message(
    conversation_id: str,
    data: MessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send a message to a conversation (also broadcasts via WebSocket)."""
    try:
        message = await message_service.send_message(
            db=db,
            conversation_id=conversation_id,
            sender_id=current_user.id,
            content=data.content,
            content_type=data.content_type,
            reply_to_id=data.reply_to_id,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )

    message_out = MessageOut.model_validate(message)

    # Broadcast via WebSocket to all conversation members
    member_ids = await conversation_service.get_conversation_member_ids(
        db, conversation_id
    )
    event = ws_events.message_event(message_out)
    await manager.broadcast_to_conversation(member_ids, event)

    return message_out


@router.patch("/{conversation_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_read(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark all messages in a conversation as read for the current user."""
    if not await conversation_service.is_member(db, conversation_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not a member"
        )

    updated_ids = await message_service.mark_conversation_messages_read(
        db, conversation_id, current_user.id
    )

    # Send read receipts via WebSocket
    if updated_ids:
        timestamp = datetime.now(timezone.utc).isoformat()
        member_ids = await conversation_service.get_conversation_member_ids(
            db, conversation_id
        )
        event = ws_events.read_receipt_event(
            conversation_id, current_user.id, updated_ids[-1], timestamp
        )
        await manager.broadcast_to_conversation(
            member_ids, event, exclude_user_id=current_user.id
        )

@router.put("/{conversation_id}/messages/{message_id}", response_model=MessageOut)
async def edit_message(
    conversation_id: str,
    message_id: str,
    data: MessageEditRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Edit a message."""
    if not await conversation_service.is_member(db, conversation_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member")
    
    try:
        message = await message_service.edit_message(db, message_id, current_user.id, data.content)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        
    message_out = MessageOut.model_validate(message)
    event = {"type": "message_update", "message": message_out.model_dump(mode="json")}
    member_ids = await conversation_service.get_conversation_member_ids(db, conversation_id)
    await manager.broadcast_to_conversation(member_ids, event)
    
    return message_out


@router.delete("/{conversation_id}/messages/{message_id}")
async def delete_message(
    conversation_id: str,
    message_id: str,
    mode: str = Query("me", description="me or everyone"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a message for me or for everyone."""
    if not await conversation_service.is_member(db, conversation_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member")
        
    try:
        updated_msg = await message_service.delete_message(db, message_id, current_user.id, mode)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        
    if mode == "everyone" and updated_msg:
        message_out = MessageOut.model_validate(updated_msg)
        event = {"type": "message_update", "message": message_out.model_dump(mode="json")}
        member_ids = await conversation_service.get_conversation_member_ids(db, conversation_id)
        await manager.broadcast_to_conversation(member_ids, event)
        return {"success": True, "message": message_out.model_dump(mode="json")}
    elif mode == "me":
        # Send a private event to current user's other devices to remove it
        event = {"type": "message_delete", "message_id": message_id}
        await manager.send_to_user(current_user.id, event)
        return {"success": True}

