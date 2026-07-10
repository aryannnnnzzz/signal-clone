"""
Outbound WebSocket event builders.
Each function constructs a standardized JSON payload for a specific event type.
"""

from app.schemas.message import MessageOut
from app.schemas.user import UserOut


def message_event(message: MessageOut) -> dict:
    """New message broadcast to conversation members."""
    return {
        "type": "message",
        "data": message.model_dump(mode="json"),
    }


def typing_event(conversation_id: str, user_id: str, display_name: str) -> dict:
    """User started typing in a conversation."""
    return {
        "type": "typing",
        "data": {
            "conversation_id": conversation_id,
            "user_id": user_id,
            "display_name": display_name,
        },
    }


def typing_stop_event(conversation_id: str, user_id: str) -> dict:
    """User stopped typing in a conversation."""
    return {
        "type": "typing_stop",
        "data": {
            "conversation_id": conversation_id,
            "user_id": user_id,
        },
    }


def read_receipt_event(
    conversation_id: str, user_id: str, message_id: str, timestamp: str
) -> dict:
    """User read messages in a conversation."""
    return {
        "type": "read_receipt",
        "data": {
            "conversation_id": conversation_id,
            "user_id": user_id,
            "message_id": message_id,
            "timestamp": timestamp,
        },
    }


def delivery_receipt_event(
    message_ids: list[str], user_id: str, timestamp: str
) -> dict:
    """Messages were delivered to a user's device."""
    return {
        "type": "delivery_receipt",
        "data": {
            "message_ids": message_ids,
            "user_id": user_id,
            "timestamp": timestamp,
        },
    }


def presence_event(user_id: str, is_online: bool, last_seen_at: str | None = None) -> dict:
    """User came online or went offline."""
    return {
        "type": "presence",
        "data": {
            "user_id": user_id,
            "is_online": is_online,
            "last_seen_at": last_seen_at,
        },
    }


def conversation_updated_event(conversation_id: str, changes: dict) -> dict:
    """Conversation metadata was updated (name, avatar)."""
    return {
        "type": "conversation_updated",
        "data": {
            "conversation_id": conversation_id,
            **changes,
        },
    }


def member_added_event(conversation_id: str, user: UserOut) -> dict:
    """A new member was added to a group conversation."""
    return {
        "type": "member_added",
        "data": {
            "conversation_id": conversation_id,
            "user": user.model_dump(mode="json"),
        },
    }


def member_removed_event(conversation_id: str, user_id: str) -> dict:
    """A member was removed from a group conversation."""
    return {
        "type": "member_removed",
        "data": {
            "conversation_id": conversation_id,
            "user_id": user_id,
        },
    }


def error_event(code: str, message: str) -> dict:
    """Error response sent to a single client."""
    return {
        "type": "error",
        "data": {
            "code": code,
            "message": message,
        },
    }
