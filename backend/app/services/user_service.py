"""
User service — profile CRUD, search, online/last-seen management.
"""

from datetime import datetime, timezone

from sqlalchemy import or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


async def get_user_by_id(db: AsyncSession, user_id: str) -> User | None:
    """Fetch a user by their UUID."""
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def search_users(db: AsyncSession, query: str, limit: int = 20) -> list[User]:
    """Search users by username or display_name (case-insensitive partial match)."""
    pattern = f"%{query}%"
    result = await db.execute(
        select(User)
        .where(
            or_(
                User.username.ilike(pattern),
                User.display_name.ilike(pattern),
            )
        )
        .limit(limit)
    )
    return list(result.scalars().all())


async def update_user_profile(
    db: AsyncSession,
    user: User,
    display_name: str | None = None,
    avatar_url: str | None = None,
    phone_number: str | None = None,
) -> User:
    """Update a user's profile fields. Only updates provided (non-None) fields."""
    if display_name is not None:
        user.display_name = display_name
    if avatar_url is not None:
        user.avatar_url = avatar_url
    if phone_number is not None:
        user.phone_number = phone_number

    await db.commit()
    await db.refresh(user)
    return user


async def set_user_online(db: AsyncSession, user_id: str) -> None:
    """Mark a user as online (called on WebSocket connect)."""
    await db.execute(
        update(User).where(User.id == user_id).values(is_online=True)
    )
    await db.commit()


async def set_user_offline(db: AsyncSession, user_id: str) -> None:
    """Mark a user as offline and update last_seen (called on WebSocket disconnect)."""
    await db.execute(
        update(User)
        .where(User.id == user_id)
        .values(is_online=False, last_seen_at=datetime.now(timezone.utc))
    )
    await db.commit()
