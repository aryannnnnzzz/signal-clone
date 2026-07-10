"""
Re-export all models so Alembic can auto-detect them via a single import.
"""

from app.models.user import User
from app.models.contact import Contact
from app.models.conversation import Conversation, ConversationMember
from app.models.message import Message, MessageStatus

__all__ = [
    "User",
    "Contact",
    "Conversation",
    "ConversationMember",
    "Message",
    "MessageStatus",
]
