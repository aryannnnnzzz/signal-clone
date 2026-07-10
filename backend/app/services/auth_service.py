"""
Authentication service — JWT creation/validation, password hashing, mock OTP.
"""

from datetime import datetime, timedelta, timezone

import bcrypt
from jose import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import User


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


async def register_user(
    db: AsyncSession,
    username: str,
    password: str,
    display_name: str,
    phone_number: str | None = None,
) -> tuple[User, str]:
    """
    Register a new user. Returns (user, access_token).
    Raises ValueError if username already exists.
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
