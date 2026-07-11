"""
Message service — send, paginate, status tracking (delivered/read).
"""

from datetime import datetime, timezone

from sqlalchemy import and_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.conversation import Conversation, ConversationMember
from app.models.message import Message, MessageStatus, MessageReaction, UserMessageDeletion
from app.services import conversation_service


async def send_message(
    db: AsyncSession,
    conversation_id: str,
    sender_id: str,
    content: str,
    content_type: str = "text",
    reply_to_id: str | None = None,
) -> Message:
    """
    Persist a new message and create status rows for all recipients.
    Also updates the conversation's updated_at for sort ordering.
    """
    # Verify sender is a member
    if not await conversation_service.is_member(db, conversation_id, sender_id):
        raise ValueError("User is not a member of this conversation")

    # Create message
    message = Message(
        conversation_id=conversation_id,
        sender_id=sender_id,
        content=content,
        content_type=content_type,
        reply_to_id=reply_to_id,
    )
    db.add(message)
    await db.flush()  # Get message ID

    # Create status rows for all OTHER members (sender doesn't need a status)
    member_ids = await conversation_service.get_conversation_member_ids(
        db, conversation_id
    )
    for mid in member_ids:
        if mid != sender_id:
            status = MessageStatus(
                message_id=message.id,
                user_id=mid,
                status="sent",
            )
            db.add(status)

    # Update conversation's updated_at for sorting
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conv = result.scalar_one()
    conv.updated_at = datetime.now(timezone.utc)

    await db.commit()

    # Reload with relationships
    result = await db.execute(
        select(Message)
        .where(Message.id == message.id)
        .options(
            selectinload(Message.sender),
            selectinload(Message.statuses),
            selectinload(Message.reply_to),
            selectinload(Message.reactions),
        )
    )
    return result.scalar_one()


async def send_system_message(
    db: AsyncSession,
    conversation_id: str,
    content: str,
) -> Message:
    """
    Creates and persists a system message (e.g. "Alice joined the group").
    Sender is NULL. Does not require read/delivery receipts.
    """
    message = Message(
        conversation_id=conversation_id,
        sender_id=None,
        content=content,
        content_type="system",
    )
    db.add(message)
    await db.flush()

    # Update conversation's updated_at
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conv = result.scalar_one()
    conv.updated_at = datetime.now(timezone.utc)

    await db.commit()

    # Reload with relationships
    result = await db.execute(
        select(Message)
        .where(Message.id == message.id)
        .options(
            selectinload(Message.sender),
            selectinload(Message.statuses),
            selectinload(Message.reply_to),
            selectinload(Message.reactions),
        )
    )
    return result.scalar_one()


async def get_messages(
    db: AsyncSession,
    conversation_id: str,
    user_id: str,
    before: datetime | None = None,
    limit: int = 50,
) -> list[Message]:
    """
    Fetch messages for a conversation with cursor-based pagination.
    `before` is the cursor — returns messages older than this timestamp.
    Filters out messages that the user has deleted for themselves.
    """
    query = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .where(~Message.id.in_(
            select(UserMessageDeletion.message_id)
            .where(UserMessageDeletion.user_id == user_id)
        ))
        .options(
            selectinload(Message.sender),
            selectinload(Message.statuses),
            selectinload(Message.reply_to).selectinload(Message.sender),
            selectinload(Message.reactions),
        )
        .order_by(Message.created_at.desc())
        .limit(limit)
    )

    if before:
        query = query.where(Message.created_at < before)

    result = await db.execute(query)
    messages = list(result.scalars().all())
    # Return in chronological order (oldest first)
    messages.reverse()
    return messages


async def edit_message(
    db: AsyncSession,
    message_id: str,
    user_id: str,
    new_content: str,
) -> Message:
    """Edit a message (only sender can edit)."""
    result = await db.execute(
        select(Message)
        .where(Message.id == message_id)
        .options(
            selectinload(Message.sender),
            selectinload(Message.statuses),
            selectinload(Message.reply_to),
            selectinload(Message.reactions),
        )
    )
    message = result.scalar_one_or_none()
    if not message:
        raise ValueError("Message not found")
    if message.sender_id != user_id:
        raise ValueError("Only the sender can edit this message")
    if message.is_deleted:
        raise ValueError("Cannot edit a deleted message")

    message.content = new_content
    message.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(message)
    return message


async def delete_message(
    db: AsyncSession,
    message_id: str,
    user_id: str,
    mode: str = "me",
) -> Message | None:
    """
    Delete a message.
    mode='me': Hides the message for the current user. Returns None (or the message if needed).
    mode='everyone': Soft deletes the message for everyone (only sender can do this). Returns updated Message.
    """
    result = await db.execute(
        select(Message)
        .where(Message.id == message_id)
        .options(
            selectinload(Message.sender),
            selectinload(Message.statuses),
            selectinload(Message.reply_to),
            selectinload(Message.reactions),
        )
    )
    message = result.scalar_one_or_none()
    if not message:
        raise ValueError("Message not found")

    if mode == "everyone":
        if message.sender_id != user_id:
            raise ValueError("Only the sender can delete a message for everyone")
        message.is_deleted = True
        message.content = "" # Clear the content
        message.updated_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(message)
        return message
    elif mode == "me":
        # Create UserMessageDeletion
        deletion = UserMessageDeletion(user_id=user_id, message_id=message_id)
        db.add(deletion)
        await db.commit()
        return None
    else:
        raise ValueError("Invalid delete mode")


async def update_message_status(
    db: AsyncSession,
    message_ids: list[str],
    user_id: str,
    status: str,
) -> None:
    """
    Batch update message statuses for a user.
    Only advances status (sent → delivered → read), never goes backward.
    """
    status_order = {"sent": 0, "delivered": 1, "read": 2}
    new_order = status_order.get(status, 0)

    for message_id in message_ids:
        result = await db.execute(
            select(MessageStatus).where(
                and_(
                    MessageStatus.message_id == message_id,
                    MessageStatus.user_id == user_id,
                )
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            current_order = status_order.get(existing.status, 0)
            if new_order > current_order:
                existing.status = status
                existing.timestamp = datetime.now(timezone.utc)

    await db.commit()


async def get_undelivered_messages(
    db: AsyncSession, user_id: str
) -> list[Message]:
    """
    Fetch all messages with status 'sent' for a user.
    Used on reconnect to deliver messages that arrived while offline.
    """
    result = await db.execute(
        select(Message)
        .join(MessageStatus)
        .where(
            and_(
                MessageStatus.user_id == user_id,
                MessageStatus.status == "sent",
            )
        )
        .options(
            selectinload(Message.sender),
            selectinload(Message.statuses),
        )
        .order_by(Message.created_at.asc())
    )
    return list(result.scalars().all())


async def mark_conversation_messages_read(
    db: AsyncSession, conversation_id: str, user_id: str
) -> list[str]:
    """
    Mark all messages in a conversation as read for a user.
    Returns list of message IDs that were updated (for sending read receipts).
    """
    # Find all message_status rows that aren't 'read' yet
    result = await db.execute(
        select(MessageStatus)
        .join(Message)
        .where(
            and_(
                Message.conversation_id == conversation_id,
                MessageStatus.user_id == user_id,
                MessageStatus.status != "read",
            )
        )
    )
    statuses = list(result.scalars().all())
    updated_message_ids = []

    for s in statuses:
        s.status = "read"
        s.timestamp = datetime.now(timezone.utc)
        updated_message_ids.append(s.message_id)

    # Also update the member's last_read_at
    await conversation_service.mark_conversation_read(db, conversation_id, user_id)

    await db.commit()
    return updated_message_ids


async def toggle_reaction(
    db: AsyncSession, message_id: str, user_id: str, emoji: str
) -> Message:
    """
    Toggles a reaction on a message for a given user.
    If the reaction exists, it is removed. If it doesn't exist, it is added.
    """
    # Check if the reaction already exists
    result = await db.execute(
        select(MessageReaction).where(
            and_(
                MessageReaction.message_id == message_id,
                MessageReaction.user_id == user_id,
                MessageReaction.emoji == emoji,
            )
        )
    )
    existing_reaction = result.scalar_one_or_none()

    if existing_reaction:
        await db.delete(existing_reaction)
    else:
        new_reaction = MessageReaction(
            message_id=message_id,
            user_id=user_id,
            emoji=emoji,
        )
        db.add(new_reaction)

    await db.commit()

    # Reload message with all relations
    result = await db.execute(
        select(Message)
        .where(Message.id == message_id)
        .options(
            selectinload(Message.sender),
            selectinload(Message.statuses),
            selectinload(Message.reply_to).selectinload(Message.sender),
            selectinload(Message.reactions),
        )
    )
    return result.scalar_one()


async def search_messages(
    db: AsyncSession,
    user_id: str,
    query: str,
    conversation_id: str | None = None,
    limit: int = 50,
) -> list[Message]:
    """
    Search for messages containing the query string.
    If conversation_id is provided, only searches that conversation.
    Otherwise, searches all conversations the user is a member of.
    """
    stmt = (
        select(Message)
        .join(Conversation, Message.conversation_id == Conversation.id)
        .join(ConversationMember, Conversation.id == ConversationMember.conversation_id)
        .where(
            and_(
                ConversationMember.user_id == user_id,
                Message.content.ilike(f"%{query}%"),
            )
        )
        .options(
            selectinload(Message.sender),
            selectinload(Message.statuses),
            selectinload(Message.reply_to).selectinload(Message.sender),
            selectinload(Message.reactions),
        )
        .order_by(Message.created_at.desc())
        .limit(limit)
    )

    if conversation_id:
        stmt = stmt.where(Message.conversation_id == conversation_id)

    result = await db.execute(stmt)
    return list(result.scalars().all())
