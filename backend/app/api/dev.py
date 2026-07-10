"""
Dev-only router — provides helper endpoints for local development and testing.

This router is ONLY for development. It should NOT be deployed to production.
Endpoints here:
  POST /api/dev/seed-conversations  — adds the authenticated user as a member of
                                       all seeded conversations so that
                                       GET /api/conversations returns real data
                                       for any freshly registered account.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.conversation import Conversation, ConversationMember
from app.models.user import User

router = APIRouter(prefix="/api/dev", tags=["dev"])

# The fixed IDs used by app/seed.py
SEED_CONVERSATION_IDS = [
    "conv-dm-ab-001",       # Alice <-> Bob DM
    "conv-dm-ac-002",       # Alice <-> Charlie DM
    "conv-dm-bd-003",       # Bob <-> Diana DM
    "conv-group-team-001",  # Project Team group
    "conv-group-friends-002",  # Friends group
]


@router.post("/seed-conversations", summary="[DEV] Add current user to seeded conversations")
async def seed_conversations_for_user(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Adds the authenticated user as a member of all seeded conversations.

    Call this once after registering a new account to populate
    GET /api/conversations with real data for development/demo purposes.

    Returns a summary of which conversations were joined.
    """
    joined = []
    already_member = []

    for conv_id in SEED_CONVERSATION_IDS:
        # Verify the conversation exists in the DB
        conv_result = await db.execute(
            select(Conversation).where(Conversation.id == conv_id)
        )
        conv = conv_result.scalar_one_or_none()
        if not conv:
            # Seed data may not have been run yet — skip silently
            continue

        # Check if already a member
        member_result = await db.execute(
            select(ConversationMember).where(
                ConversationMember.conversation_id == conv_id,
                ConversationMember.user_id == current_user.id,
            )
        )
        existing = member_result.scalar_one_or_none()

        if existing:
            already_member.append(conv_id)
            continue

        # Add as member
        new_member = ConversationMember(
            conversation_id=conv_id,
            user_id=current_user.id,
            role="member",
        )
        db.add(new_member)
        joined.append(conv_id)

    await db.commit()

    return {
        "user_id": current_user.id,
        "username": current_user.username,
        "joined": joined,
        "already_member": already_member,
        "message": (
            f"Added to {len(joined)} conversation(s). "
            f"Was already in {len(already_member)}. "
            "Call GET /api/conversations to see results."
        ),
    }
