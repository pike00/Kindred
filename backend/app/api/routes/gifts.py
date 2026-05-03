"""Gift management routes."""

import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.crud import contact_visible, create_gift
from app.models import Gift, GiftCreate, GiftPublic, GiftsPublic, GiftUpdate

router = APIRouter(prefix="/gifts", tags=["gifts"])


def _require_contact_visible(session: Any, user: Any, contact_id: uuid.UUID) -> None:
    if not contact_visible(session=session, user=user, contact_id=contact_id):
        raise HTTPException(status_code=404, detail="Contact not found")


@router.get("/contact/{contact_id}", response_model=GiftsPublic)
def list_gifts(
    session: SessionDep,
contact_id: uuid.UUID,
) -> Any:
    """List gifts for a contact."""
    _require_contact_visible(session, current_user, contact_id)

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
gift_in: GiftCreate,
) -> Any:
    """Create a new gift."""
    _require_contact_visible(session, current_user, gift_in.contact_id)

    gift = create_gift(session=session, gift_in=gift_in, owner_id=current_user.id)
    return GiftPublic.model_validate(gift)


@router.patch("/{gift_id}", response_model=GiftPublic)
def update_gift(
    *,
    session: SessionDep,
gift_id: uuid.UUID,
    gift_in: GiftUpdate,
) -> Any:
    """Update a gift."""
    gift = session.get(Gift, gift_id)
    if gift is None:
        raise HTTPException(status_code=404, detail="Gift not found")
    _require_contact_visible(session, current_user, gift.contact_id)

    update_data = gift_in.model_dump(exclude_unset=True)
    gift.sqlmodel_update(update_data)
    session.add(gift)
    session.commit()
    session.refresh(gift)
    return GiftPublic.model_validate(gift)


@router.delete("/{gift_id}")
def delete_gift(
    session: SessionDep,
gift_id: uuid.UUID,
) -> Any:
    """Soft-delete a gift by setting deleted_at."""
    gift = session.get(Gift, gift_id)
    if gift is None:
        raise HTTPException(status_code=404, detail="Gift not found")
    _require_contact_visible(session, current_user, gift.contact_id)

    from datetime import datetime, timezone

    gift.deleted_at = datetime.now(timezone.utc)
    session.add(gift)
    session.commit()
    return {"ok": True}


@router.post("/{gift_id}/restore")
def restore_gift(
    session: SessionDep,
gift_id: uuid.UUID,
) -> Any:
    """Restore a soft-deleted gift by clearing deleted_at."""
    from sqlalchemy import text, update

    result = session.exec(
        text("SELECT id FROM gift WHERE id = :id AND deleted_at IS NOT NULL"),
        params={"id": str(gift_id)},
    ).first()
    if result is None:
        raise HTTPException(status_code=404, detail="Gift not found or not deleted")
    session.exec(update(Gift).where(Gift.id == gift_id).values(deleted_at=None))
    session.commit()
    return {"ok": True}
