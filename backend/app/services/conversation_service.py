"""
Conversation service — create DM/group, list, member management, unread counts.
"""

from datetime import datetime, timezone

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.conversation import Conversation, ConversationMember
from app.models.message import Message
from app.models.user import User


async def get_or_create_dm(
    db: AsyncSession, user_id: str, other_user_id: str
) -> Conversation:
    """
    Get existing DM between two users, or create one.
    Idempotent — calling twice returns the same conversation.
    """
    if user_id == other_user_id:
        raise ValueError("Cannot create DM with yourself")

    # Check other user exists
    result = await db.execute(select(User).where(User.id == other_user_id))
    if not result.scalar_one_or_none():
        raise ValueError("User not found")

    # Find existing DM: a conversation of type "dm" where both users are members
    subq1 = (
        select(ConversationMember.conversation_id)
        .where(ConversationMember.user_id == user_id)
    )
    subq2 = (
        select(ConversationMember.conversation_id)
        .where(ConversationMember.user_id == other_user_id)
    )
    result = await db.execute(
        select(Conversation)
        .where(
            and_(
                Conversation.type == "dm",
                Conversation.id.in_(subq1),
                Conversation.id.in_(subq2),
            )
        )
        .options(selectinload(Conversation.members).selectinload(ConversationMember.user))
    )
    existing = result.scalar_one_or_none()
    if existing:
        return existing

    # Create new DM
    conversation = Conversation(type="dm", created_by=user_id)
    db.add(conversation)
    await db.flush()  # Get the conversation ID

    member1 = ConversationMember(
        conversation_id=conversation.id, user_id=user_id, role="member"
    )
    member2 = ConversationMember(
        conversation_id=conversation.id, user_id=other_user_id, role="member"
    )
    db.add_all([member1, member2])
    await db.commit()

    # Reload with relationships
    result = await db.execute(
        select(Conversation)
        .where(Conversation.id == conversation.id)
        .options(selectinload(Conversation.members).selectinload(ConversationMember.user))
    )
    return result.scalar_one()


async def create_group(
    db: AsyncSession,
    creator_id: str,
    name: str,
    member_ids: list[str],
) -> Conversation:
    """
    Create a group conversation. Creator is automatically added as admin.
    """
    # Ensure creator is in member list
    all_member_ids = list(set([creator_id] + member_ids))

    # Validate all members exist
    result = await db.execute(select(User.id).where(User.id.in_(all_member_ids)))
    found_ids = set(result.scalars().all())
    missing = set(all_member_ids) - found_ids
    if missing:
        raise ValueError(f"Users not found: {missing}")

    conversation = Conversation(
        type="group",
        group_name=name,
        created_by=creator_id,
    )
    db.add(conversation)
    await db.flush()

    for uid in all_member_ids:
        member = ConversationMember(
            conversation_id=conversation.id,
            user_id=uid,
            role="admin" if uid == creator_id else "member",
        )
        db.add(member)

    await db.commit()

    # Reload with relationships
    result = await db.execute(
        select(Conversation)
        .where(Conversation.id == conversation.id)
        .options(selectinload(Conversation.members).selectinload(ConversationMember.user))
    )
    return result.scalar_one()


async def get_conversation(db: AsyncSession, conversation_id: str) -> Conversation | None:
    """Get a single conversation with members loaded."""
    result = await db.execute(
        select(Conversation)
        .where(Conversation.id == conversation_id)
        .options(selectinload(Conversation.members).selectinload(ConversationMember.user))
    )
    return result.scalar_one_or_none()


async def get_user_conversations(db: AsyncSession, user_id: str) -> list[dict]:
    """
    Get all conversations for a user, sorted by most recent activity.
    Returns dicts with conversation data, last message, and unread count.
    """
    # Get conversation IDs the user belongs to
    member_result = await db.execute(
        select(ConversationMember).where(ConversationMember.user_id == user_id)
    )
    memberships = list(member_result.scalars().all())
    conv_ids = [m.conversation_id for m in memberships]
    membership_map = {m.conversation_id: m for m in memberships}

    if not conv_ids:
        return []

    # Load conversations with members
    result = await db.execute(
        select(Conversation)
        .where(Conversation.id.in_(conv_ids))
        .options(selectinload(Conversation.members).selectinload(ConversationMember.user))
        .order_by(Conversation.updated_at.desc())
    )
    conversations = list(result.scalars().all())

    items = []
    for conv in conversations:
        membership = membership_map[conv.id]

        # Get last message
        last_msg_result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conv.id)
            .order_by(Message.created_at.desc())
            .limit(1)
        )
        last_message = last_msg_result.scalar_one_or_none()

        # Compute unread count
        unread_count = 0
        if membership.last_read_at:
            count_result = await db.execute(
                select(func.count(Message.id)).where(
                    and_(
                        Message.conversation_id == conv.id,
                        Message.created_at > membership.last_read_at,
                        Message.sender_id != user_id,
                    )
                )
            )
            unread_count = count_result.scalar() or 0
        elif last_message:
            # Never read — count all messages from others
            count_result = await db.execute(
                select(func.count(Message.id)).where(
                    and_(
                        Message.conversation_id == conv.id,
                        Message.sender_id != user_id,
                    )
                )
            )
            unread_count = count_result.scalar() or 0

        items.append({
            "conversation": conv,
            "last_message": last_message,
            "unread_count": unread_count,
        })

    return items


async def is_member(
    db: AsyncSession, conversation_id: str, user_id: str
) -> bool:
    """Check if a user is a member of a conversation."""
    result = await db.execute(
        select(ConversationMember).where(
            and_(
                ConversationMember.conversation_id == conversation_id,
                ConversationMember.user_id == user_id,
            )
        )
    )
    return result.scalar_one_or_none() is not None


async def is_admin(
    db: AsyncSession, conversation_id: str, user_id: str
) -> bool:
    """Check if a user is an admin of a conversation."""
    result = await db.execute(
        select(ConversationMember).where(
            and_(
                ConversationMember.conversation_id == conversation_id,
                ConversationMember.user_id == user_id,
                ConversationMember.role == "admin",
            )
        )
    )
    return result.scalar_one_or_none() is not None


async def add_member(
    db: AsyncSession, conversation_id: str, user_id: str
) -> ConversationMember:
    """Add a member to a group conversation."""
    # Check user exists
    result = await db.execute(select(User).where(User.id == user_id))
    if not result.scalar_one_or_none():
        raise ValueError("User not found")

    # Check not already member
    if await is_member(db, conversation_id, user_id):
        raise ValueError("User is already a member")

    member = ConversationMember(
        conversation_id=conversation_id,
        user_id=user_id,
        role="member",
    )
    db.add(member)
    await db.commit()
    await db.refresh(member)
    return member


async def remove_member(
    db: AsyncSession, conversation_id: str, user_id: str
) -> bool:
    """Remove a member from a group conversation. Returns True if removed."""
    result = await db.execute(
        select(ConversationMember).where(
            and_(
                ConversationMember.conversation_id == conversation_id,
                ConversationMember.user_id == user_id,
            )
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        return False

    await db.delete(member)
    await db.commit()
    return True


async def update_conversation(
    db: AsyncSession,
    conversation_id: str,
    name: str | None = None,
    avatar_url: str | None = None,
) -> Conversation:
    """Update group name/avatar."""
    conv = await get_conversation(db, conversation_id)
    if not conv:
        raise ValueError("Conversation not found")

    if name is not None:
        conv.group_name = name
    if avatar_url is not None:
        conv.group_avatar_url = avatar_url

    await db.commit()
    await db.refresh(conv)
    return conv


async def mark_conversation_read(
    db: AsyncSession, conversation_id: str, user_id: str
) -> None:
    """Update last_read_at for a user's membership in a conversation."""
    result = await db.execute(
        select(ConversationMember).where(
            and_(
                ConversationMember.conversation_id == conversation_id,
                ConversationMember.user_id == user_id,
            )
        )
    )
    member = result.scalar_one_or_none()
    if member:
        member.last_read_at = datetime.now(timezone.utc)
        await db.commit()


async def get_conversation_member_ids(
    db: AsyncSession, conversation_id: str
) -> list[str]:
    """Get all member user IDs for a conversation."""
    result = await db.execute(
        select(ConversationMember.user_id).where(
            ConversationMember.conversation_id == conversation_id
        )
    )
    return list(result.scalars().all())
