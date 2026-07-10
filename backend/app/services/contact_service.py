"""
Contact service — add, remove, list contacts for a user.
"""

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.contact import Contact
from app.models.user import User


async def get_contacts(db: AsyncSession, owner_id: str) -> list[Contact]:
    """List all contacts for a given user."""
    result = await db.execute(
        select(Contact).where(Contact.owner_id == owner_id)
    )
    return list(result.scalars().all())


async def add_contact(
    db: AsyncSession,
    owner_id: str,
    contact_user_id: str,
    nickname: str | None = None,
) -> Contact:
    """
    Add a user to the owner's contact list.
    Raises ValueError if contact already exists or user doesn't exist.
    """
    if owner_id == contact_user_id:
        raise ValueError("Cannot add yourself as a contact")

    # Check if contact user exists
    result = await db.execute(select(User).where(User.id == contact_user_id))
    if not result.scalar_one_or_none():
        raise ValueError("User not found")

    # Check for duplicate
    result = await db.execute(
        select(Contact).where(
            and_(
                Contact.owner_id == owner_id,
                Contact.contact_user_id == contact_user_id,
            )
        )
    )
    if result.scalar_one_or_none():
        raise ValueError("Contact already exists")

    contact = Contact(
        owner_id=owner_id,
        contact_user_id=contact_user_id,
        nickname=nickname,
    )
    db.add(contact)
    await db.commit()
    await db.refresh(contact)
    return contact


async def remove_contact(db: AsyncSession, owner_id: str, contact_id: str) -> bool:
    """
    Remove a contact. Returns True if deleted, False if not found.
    Only the owner can remove their own contacts.
    """
    result = await db.execute(
        select(Contact).where(
            and_(Contact.id == contact_id, Contact.owner_id == owner_id)
        )
    )
    contact = result.scalar_one_or_none()
    if not contact:
        return False

    await db.delete(contact)
    await db.commit()
    return True
