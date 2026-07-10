"""
Contacts API router — /api/contacts endpoints for managing the contact list.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.contact import ContactCreate, ContactOut
from app.services import contact_service

router = APIRouter(prefix="/api/contacts", tags=["contacts"])


@router.get("", response_model=list[ContactOut])
async def list_contacts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all contacts for the current user."""
    contacts = await contact_service.get_contacts(db, current_user.id)
    return [ContactOut.model_validate(c) for c in contacts]


@router.post("", response_model=ContactOut, status_code=status.HTTP_201_CREATED)
async def add_contact(
    data: ContactCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a user to the current user's contact list."""
    try:
        contact = await contact_service.add_contact(
            db=db,
            owner_id=current_user.id,
            contact_user_id=data.contact_user_id,
            nickname=data.nickname,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )

    return ContactOut.model_validate(contact)


@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_contact(
    contact_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a contact from the current user's contact list."""
    deleted = await contact_service.remove_contact(
        db=db, owner_id=current_user.id, contact_id=contact_id
    )
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found"
        )
