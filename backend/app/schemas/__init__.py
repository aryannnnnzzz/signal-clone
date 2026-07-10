"""
Schema re-exports for convenient imports.
"""

from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    VerifyOTPRequest,
    VerifyOTPResponse,
)
from app.schemas.contact import ContactCreate, ContactOut
from app.schemas.conversation import (
    ConversationListItem,
    ConversationOut,
    ConversationUpdate,
    DMCreate,
    GroupCreate,
    MemberAdd,
    MemberOut,
)
from app.schemas.message import (
    MarkReadRequest,
    MessageCreate,
    MessageOut,
    MessageStatusOut,
    MessageStatusUpdate,
)
from app.schemas.user import UserOut, UserUpdate

__all__ = [
    "AuthResponse",
    "LoginRequest",
    "RegisterRequest",
    "TokenResponse",
    "VerifyOTPRequest",
    "VerifyOTPResponse",
    "ContactCreate",
    "ContactOut",
    "ConversationListItem",
    "ConversationOut",
    "ConversationUpdate",
    "DMCreate",
    "GroupCreate",
    "MemberAdd",
    "MemberOut",
    "MarkReadRequest",
    "MessageCreate",
    "MessageOut",
    "MessageStatusOut",
    "MessageStatusUpdate",
    "UserOut",
    "UserUpdate",
]
