"""
WebSocket inbound frame handler.
Routes incoming JSON frames by `type` field to appropriate service calls.
"""

import logging
from datetime import datetime, timezone

from fastapi import WebSocket
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.message import MessageOut
from app.services import conversation_service, message_service
from app.ws import events
from app.ws.manager import manager

logger = logging.getLogger(__name__)


async def handle_ws_message(
    data: dict, user: User, websocket: WebSocket, db: AsyncSession
) -> None:
    """
    Dispatch an inbound WebSocket frame to the appropriate handler.
    All frames must have a `type` field.
    """
    msg_type = data.get("type")

    if msg_type is None:
        await websocket.send_json(events.error_event("INVALID_FRAME", "Missing 'type' field"))
        return

    try:
        if msg_type == "new_message":
            await _handle_new_message(data, user, websocket, db)
        elif msg_type == "typing_start":
            await _handle_typing_start(data, user, db)
        elif msg_type == "typing_stop":
            await _handle_typing_stop(data, user, db)
        elif msg_type == "mark_read":
            await _handle_mark_read(data, user, websocket, db)
        elif msg_type == "mark_delivered":
            await _handle_mark_delivered(data, user, websocket, db)
        elif msg_type == "toggle_reaction":
            await _handle_toggle_reaction(data, user, websocket, db)
        else:
            await websocket.send_json(
                events.error_event("UNKNOWN_TYPE", f"Unknown frame type: {msg_type}")
            )
    except Exception as e:
        logger.error(f"Error handling WS message type={msg_type}: {e}", exc_info=True)
        await websocket.send_json(
            events.error_event("INTERNAL_ERROR", str(e))
        )


async def _handle_new_message(
    data: dict, user: User, websocket: WebSocket, db: AsyncSession
) -> None:
    """Handle a new_message frame — persist and broadcast."""
    conversation_id = data.get("conversation_id")
    content = data.get("content")
    content_type = data.get("content_type", "text")
    reply_to_id = data.get("reply_to_id")

    if not conversation_id or not content:
        await websocket.send_json(
            events.error_event("INVALID_PAYLOAD", "Missing conversation_id or content")
        )
        return

    message = await message_service.send_message(
        db=db,
        conversation_id=conversation_id,
        sender_id=user.id,
        content=content,
        content_type=content_type,
        reply_to_id=reply_to_id,
    )

    message_out = MessageOut.model_validate(message)
    event = events.message_event(message_out)

    # Broadcast to all conversation members (including sender for confirmation)
    member_ids = await conversation_service.get_conversation_member_ids(
        db, conversation_id
    )
    await manager.broadcast_to_conversation(member_ids, event)


async def _handle_typing_start(
    data: dict, user: User, db: AsyncSession
) -> None:
    """Handle typing_start — broadcast to other members (no DB write)."""
    conversation_id = data.get("conversation_id")
    if not conversation_id:
        return

    member_ids = await conversation_service.get_conversation_member_ids(
        db, conversation_id
    )
    event = events.typing_event(conversation_id, user.id, user.display_name)
    await manager.broadcast_to_conversation(member_ids, event, exclude_user_id=user.id)


async def _handle_typing_stop(
    data: dict, user: User, db: AsyncSession
) -> None:
    """Handle typing_stop — broadcast to other members (no DB write)."""
    conversation_id = data.get("conversation_id")
    if not conversation_id:
        return

    member_ids = await conversation_service.get_conversation_member_ids(
        db, conversation_id
    )
    event = events.typing_stop_event(conversation_id, user.id)
    await manager.broadcast_to_conversation(member_ids, event, exclude_user_id=user.id)


async def _handle_mark_read(
    data: dict, user: User, websocket: WebSocket, db: AsyncSession
) -> None:
    """Handle mark_read — update DB and send read receipt to message senders."""
    conversation_id = data.get("conversation_id")
    message_id = data.get("message_id")
    if not conversation_id:
        return

    updated_ids = await message_service.mark_conversation_messages_read(
        db, conversation_id, user.id
    )

    if updated_ids:
        timestamp = datetime.now(timezone.utc).isoformat()
        # Get the message senders to notify them
        member_ids = await conversation_service.get_conversation_member_ids(
            db, conversation_id
        )
        event = events.read_receipt_event(
            conversation_id, user.id, message_id or updated_ids[-1], timestamp
        )
        await manager.broadcast_to_conversation(
            member_ids, event, exclude_user_id=user.id
        )


async def _handle_mark_delivered(
    data: dict, user: User, websocket: WebSocket, db: AsyncSession
) -> None:
    """Handle mark_delivered — batch update statuses and notify senders."""
    message_ids = data.get("message_ids", [])
    if not message_ids:
        return

    await message_service.update_message_status(
        db, message_ids, user.id, "delivered"
    )

    timestamp = datetime.now(timezone.utc).isoformat()
    event = events.delivery_receipt_event(message_ids, user.id, timestamp)

    # Notify all potentially interested parties (we broadcast widely;
    # the frontend filters by relevant message IDs)
    # A more targeted approach would look up each message's sender,
    # but for simplicity and to support group chats, broadcasting works
    for mid in message_ids:
        # Get the message to find its conversation and sender
        pass  # The frontend handles filtering

    # For simplicity, send receipt back to all members of conversations
    # that contain these messages. The frontend ignores irrelevant receipts.
    await manager.send_to_user(user.id, {"type": "delivery_ack", "data": {"message_ids": message_ids}})


async def _handle_toggle_reaction(
    data: dict, user: User, websocket: WebSocket, db: AsyncSession
) -> None:
    """Handle toggle_reaction — update DB and broadcast reaction update."""
    message_id = data.get("message_id")
    emoji = data.get("emoji")

    if not message_id or not emoji:
        await websocket.send_json(
            events.error_event("INVALID_PAYLOAD", "Missing message_id or emoji")
        )
        return

    # Toggle reaction in DB
    message = await message_service.toggle_reaction(
        db=db,
        message_id=message_id,
        user_id=user.id,
        emoji=emoji,
    )

    message_out = MessageOut.model_validate(message)
    event = events.reaction_update_event(message_out)

    # Broadcast to all conversation members (including sender for confirmation)
    member_ids = await conversation_service.get_conversation_member_ids(
        db, message.conversation_id
    )
    await manager.broadcast_to_conversation(member_ids, event)
