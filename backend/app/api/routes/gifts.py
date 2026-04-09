"""Gift management routes."""

import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.crud import create_gift
from app.models import Contact, Gift, GiftCreate, GiftPublic, GiftUpdate, GiftsPublic

router = APIRouter(prefix="/gifts", tags=["gifts"])


@router.get("/contact/{contact_id}", response_model=GiftsPublic)
def list_gifts(
    session: SessionDep,
    current_user: CurrentUser,
    contact_id: uuid.UUID,
) -> Any:
    """List gifts for a contact."""
    contact = session.get(Contact, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    if contact.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    statement = select(Gift).where(Gift.contact_id == contact_id)
    gifts = session.exec(statement).all()

    return GiftsPublic(
        data=[GiftPublic.model_validate(g) for g in gifts],
        count=len(gifts),
    )


@router.post("/", response_model=GiftPublic)
def create_gift_route(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    gift_in: GiftCreate,
) -> Any:
    """Create a new gift."""
    contact = session.get(Contact, gift_in.contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    if contact.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    gift = create_gift(session=session, gift_in=gift_in, owner_id=current_user.id)
    return GiftPublic.model_validate(gift)


@router.patch("/{gift_id}", response_model=GiftPublic)
def update_gift(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    gift_id: uuid.UUID,
    gift_in: GiftUpdate,
) -> Any:
    """Update a gift."""
    gift = session.get(Gift, gift_id)
    if not gift:
        raise HTTPException(status_code=404, detail="Gift not found")
    if gift.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    update_data = gift_in.model_dump(exclude_unset=True)
    gift.sqlmodel_update(update_data)
    session.add(gift)
    session.commit()
    session.refresh(gift)
    return GiftPublic.model_validate(gift)


@router.delete("/{gift_id}")
def delete_gift(
    session: SessionDep,
    current_user: CurrentUser,
    gift_id: uuid.UUID,
) -> Any:
    """Delete a gift."""
    gift = session.get(Gift, gift_id)
    if not gift:
        raise HTTPException(status_code=404, detail="Gift not found")
    if gift.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    session.delete(gift)
    session.commit()
    return {"ok": True}
