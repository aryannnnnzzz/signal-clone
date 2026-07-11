"""
Conversations API router — /api/conversations endpoints.
Handles DM/group creation, listing, member management.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.conversation import (
    ConversationListItem,
    ConversationOut,
    ConversationUpdate,
    DMCreate,
    GroupCreate,
    MemberAdd,
    MemberOut,
)
from app.schemas.message import MessageOut
from app.schemas.user import UserOut
from app.services import conversation_service, message_service
from app.ws import events as ws_events
from app.ws.manager import manager

router = APIRouter(prefix="/api/conversations", tags=["conversations"])


@router.get("", response_model=list[ConversationListItem])
async def list_conversations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all conversations for the current user, sorted by most recent activity."""
    items = await conversation_service.get_user_conversations(db, current_user.id)
    result = []
    for item in items:
        conv = item["conversation"]
        last_msg = item["last_message"]
        unread = item["unread_count"]

        conv_data = ConversationListItem(
            id=conv.id,
            type=conv.type,
            group_name=conv.group_name,
            group_avatar_url=conv.group_avatar_url,
            created_at=conv.created_at,
            updated_at=conv.updated_at,
            members=[MemberOut.model_validate(m) for m in conv.members],
            last_message=MessageOut.model_validate(last_msg) if last_msg else None,
            unread_count=unread,
        )
        result.append(conv_data)

    return result


@router.post("/dm", response_model=ConversationOut, status_code=status.HTTP_201_CREATED)
async def create_dm(
    data: DMCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create or get an existing DM with another user."""
    try:
        conversation = await conversation_service.get_or_create_dm(
            db=db, user_id=current_user.id, other_user_id=data.user_id
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )

    return ConversationOut.model_validate(conversation)


@router.post("/group", response_model=ConversationOut, status_code=status.HTTP_201_CREATED)
async def create_group(
    data: GroupCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new group conversation."""
    try:
        conversation = await conversation_service.create_group(
            db=db,
            creator_id=current_user.id,
            name=data.name,
            member_ids=data.member_ids,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )

    # Broadcast system message
    sys_msg = await message_service.send_system_message(
        db, conversation.id, f"{current_user.display_name} created the group."
    )
    msg_out = MessageOut.model_validate(sys_msg)
    event = ws_events.message_event(msg_out)
    await manager.broadcast_to_conversation(
        await conversation_service.get_conversation_member_ids(db, conversation.id), event
    )

    return ConversationOut.model_validate(conversation)


@router.get("/{conversation_id}", response_model=ConversationOut)
async def get_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get conversation details with members."""
    # Verify membership
    if not await conversation_service.is_member(db, conversation_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not a member"
        )

    conv = await conversation_service.get_conversation(db, conversation_id)
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found"
        )

    return ConversationOut.model_validate(conv)


@router.patch("/{conversation_id}", response_model=ConversationOut)
async def update_conversation(
    conversation_id: str,
    data: ConversationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update group name/avatar (admin only)."""
    if not await conversation_service.is_admin(db, conversation_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required"
        )

    try:
        conv = await conversation_service.update_conversation(
            db=db,
            conversation_id=conversation_id,
            name=data.name,
            avatar_url=data.avatar_url,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(e)
        )

    # Broadcast update to all members via WebSocket
    member_ids = await conversation_service.get_conversation_member_ids(db, conversation_id)
    changes = {}
    sys_messages = []
    if data.name is not None:
        changes["group_name"] = data.name
        sys_messages.append(f"Group name changed to {data.name}.")
    if data.avatar_url is not None:
        changes["group_avatar_url"] = data.avatar_url
        sys_messages.append("Group photo changed.")
        
    if changes:
        event = ws_events.conversation_updated_event(conversation_id, changes)
        await manager.broadcast_to_conversation(member_ids, event)
        
        for content in sys_messages:
            sys_msg = await message_service.send_system_message(db, conversation_id, content)
            msg_out = MessageOut.model_validate(sys_msg)
            await manager.broadcast_to_conversation(member_ids, ws_events.message_event(msg_out))

    return ConversationOut.model_validate(conv)


@router.post("/{conversation_id}/members", response_model=MemberOut, status_code=status.HTTP_201_CREATED)
async def add_member(
    conversation_id: str,
    data: MemberAdd,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a member to a group conversation (admin only)."""
    if not await conversation_service.is_admin(db, conversation_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required"
        )

    try:
        member = await conversation_service.add_member(
            db=db, conversation_id=conversation_id, user_id=data.user_id
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )

    # Broadcast member_added to all conversation members
    member_ids = await conversation_service.get_conversation_member_ids(db, conversation_id)
    from app.services.user_service import get_user_by_id
    new_user = await get_user_by_id(db, data.user_id)
    if new_user:
        event = ws_events.member_added_event(
            conversation_id, UserOut.model_validate(new_user)
        )
        await manager.broadcast_to_conversation(member_ids, event)
        
        # System message
        sys_msg = await message_service.send_system_message(
            db, conversation_id, f"{new_user.display_name} joined the group."
        )
        msg_out = MessageOut.model_validate(sys_msg)
        await manager.broadcast_to_conversation(member_ids, ws_events.message_event(msg_out))

    return MemberOut.model_validate(member)


@router.delete("/{conversation_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    conversation_id: str,
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a member from a group conversation (admin only, or self-removal)."""
    is_self_removal = user_id == current_user.id
    if not is_self_removal and not await conversation_service.is_admin(
        db, conversation_id, current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required"
        )

    # Get member list before removal for broadcast
    member_ids = await conversation_service.get_conversation_member_ids(db, conversation_id)

    removed = await conversation_service.remove_member(
        db=db, conversation_id=conversation_id, user_id=user_id
    )
    if not removed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Member not found"
        )

    # Broadcast member_removed to all conversation members (including the removed user)
    event = ws_events.member_removed_event(conversation_id, user_id)
    await manager.broadcast_to_conversation(member_ids, event)

    # System message
    from app.services.user_service import get_user_by_id
    removed_user = await get_user_by_id(db, user_id)
    if removed_user:
        action = "left" if is_self_removal else "was removed from"
        sys_msg = await message_service.send_system_message(
            db, conversation_id, f"{removed_user.display_name} {action} the group."
        )
        msg_out = MessageOut.model_validate(sys_msg)
        # Broadcast to remaining members
        current_members = await conversation_service.get_conversation_member_ids(db, conversation_id)
        await manager.broadcast_to_conversation(current_members, ws_events.message_event(msg_out))
