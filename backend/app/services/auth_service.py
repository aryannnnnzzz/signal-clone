"""
Authentication service — JWT creation/validation, password hashing, mock OTP.
"""

import logging
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import User

logger = logging.getLogger(__name__)

# Stable ID of the seeded "alice" user (see app/seed.py).
# Used to create an initial welcome DM for every new registrant so that
# GET /api/conversations returns at least one conversation immediately.
_SEED_ALICE_ID = "user-alice-001"


def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt."""
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"), hashed_password.encode("utf-8")
    )


def create_access_token(user_id: str) -> str:
    """Create a JWT access token with user_id as subject and 24h expiry."""
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode = {"sub": user_id, "exp": expire, "iat": datetime.now(timezone.utc)}
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


async def _bootstrap_welcome_conversation(db: AsyncSession, new_user: User) -> None:
    """
    Create a welcome conversation for a newly registered user.

    If the seed user alice (user-alice-001) exists in the database, a DM is
    opened between alice and the new user and alice sends a greeting message.
    This mirrors how production messaging apps (Telegram, Signal) surface a
    "System" or "Welcome" message for brand-new accounts.

    If the database has not been seeded (alice absent), the function returns
    silently — registration still succeeds and the user can create their own
    conversations via the UI.
    """
    # Import here to avoid circular dependencies at module level
    from app.services import conversation_service, message_service

    try:
        # Check whether the seed user exists
        result = await db.execute(select(User).where(User.id == _SEED_ALICE_ID))
        alice = result.scalar_one_or_none()

        if alice is None:
            # Unseeded database — skip gracefully
            logger.info(
                "Seed user alice not found; skipping welcome conversation for %s",
                new_user.username,
            )
            return

        # Create (or retrieve idempotently) a DM between alice and the new user
        dm = await conversation_service.get_or_create_dm(
            db=db,
            user_id=_SEED_ALICE_ID,
            other_user_id=new_user.id,
        )

        # Send a welcome message from alice
        await message_service.send_message(
            db=db,
            conversation_id=dm.id,
            sender_id=_SEED_ALICE_ID,
            content=(
                f"👋 Welcome to Signal Clone, {new_user.display_name}! "
                "This is Alice from the demo team. Feel free to send me a message — "
                "I'm here to help you explore the app. You can also search for other "
                "users (bob, charlie, diana, eve) and start a conversation!"
            ),
            content_type="text",
        )

        logger.info(
            "Created welcome DM (id=%s) for new user %s", dm.id, new_user.username
        )

    except Exception:
        # Never let a failed welcome message block registration
        logger.exception(
            "Failed to create welcome conversation for user %s — registration continues",
            new_user.username,
        )


async def register_user(
    db: AsyncSession,
    username: str,
    password: str,
    display_name: str,
    phone_number: str | None = None,
) -> tuple[User, str]:
    """
    Register a new user. Returns (user, access_token).

    After the user row is persisted, automatically creates a welcome DM with
    the seed user alice so that GET /api/conversations immediately returns at
    least one conversation for the new account.

    Raises ValueError if username or phone number already exists.
    """
    # Check uniqueness
    result = await db.execute(select(User).where(User.username == username))
    if result.scalar_one_or_none():
        raise ValueError("Username already taken")

    if phone_number:
        result = await db.execute(
            select(User).where(User.phone_number == phone_number)
        )
        if result.scalar_one_or_none():
            raise ValueError("Phone number already registered")

    user = User(
        username=username,
        password_hash=hash_password(password),
        display_name=display_name,
        phone_number=phone_number,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Automatically create a welcome conversation so the new user's
    # GET /api/conversations is never empty on first login.
    await _bootstrap_welcome_conversation(db, user)

    token = create_access_token(user.id)
    return user, token


async def login_user(
    db: AsyncSession, username: str, password: str
) -> tuple[User, str]:
    """
    Authenticate a user by username + password. Returns (user, access_token).
    Raises ValueError on invalid credentials.
    """
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()

    if not user or not verify_password(password, user.password_hash):
        raise ValueError("Invalid username or password")

    token = create_access_token(user.id)
    return user, token


def verify_otp(phone_number: str, otp: str) -> bool:
    """Mock OTP verification — always accepts the configured mock OTP."""
    return otp == settings.MOCK_OTP
