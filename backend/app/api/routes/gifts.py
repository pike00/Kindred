"""Gift management routes."""

import uuid
from datetime import date, datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.crud import contact_visible, create_gift
from app.models import (
    Contact,
    Gift,
    GiftCreate,
    GiftPublic,
    GiftsPublic,
    GiftStatus,
    GiftUpdate,
    Ok,
)

router = APIRouter(prefix="/gifts", tags=["gifts"])


def _require_contact_visible(session: Any, user: Any, contact_id: uuid.UUID) -> None:
    if not contact_visible(session=session, user=user, contact_id=contact_id):
        raise HTTPException(status_code=404, detail="Contact not found")


def _days_until_birthday(birthday: date | None, today: date | None = None) -> int | None:
    """Calculate days until the next occurrence of a birthday."""
    if not birthday:
        return None
    today = today or date.today()
    try:
        next_bday = date(today.year, birthday.month, birthday.day)
    except ValueError:
        next_bday = date(today.year, 3, 1)
    if next_bday < today:
        try:
            next_bday = date(today.year + 1, birthday.month, birthday.day)
        except ValueError:
            next_bday = date(today.year + 1, 3, 1)
    return (next_bday - today).days


@router.get("/contact/{contact_id}", response_model=GiftsPublic)
def list_gifts(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    contact_id: uuid.UUID,
) -> Any:
    """List gifts for a contact with days_until_occasion."""
    _require_contact_visible(session, current_user, contact_id)

    statement = (
        select(Gift, Contact.birthday, Contact.first_name, Contact.last_name)
        .join(Contact, Gift.contact_id == Contact.id)
        .where(Gift.contact_id == contact_id, Gift.deleted_at.is_(None))
    )
    results = session.exec(statement).all()

    gifts_data = []
    for gift, birthday, first_name, last_name in results:
        days_until = _days_until_birthday(birthday)
        gifts_data.append(
            GiftPublic(
                **gift.model_dump(),
                days_until_occasion=days_until,
                contact_birthday=birthday,
                contact_first_name=first_name,
                contact_last_name=last_name,
            )
        )

    return GiftsPublic(
        data=gifts_data,
        count=len(gifts_data),
    )


@router.post("/", response_model=GiftPublic)
def create_gift_route(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    gift_in: GiftCreate,
) -> GiftPublic:
    """Create a new gift."""
    _require_contact_visible(session, current_user, gift_in.contact_id)

    gift = create_gift(session=session, gift_in=gift_in, owner_id=current_user.id)
    return GiftPublic.model_validate(gift)


@router.patch("/{gift_id}", response_model=GiftPublic)
def update_gift(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    gift_id: uuid.UUID,
    gift_in: GiftUpdate,
) -> GiftPublic:
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


@router.delete("/{gift_id}", response_model=Ok)
def delete_gift(
    session: SessionDep,
    current_user: CurrentUser,
    gift_id: uuid.UUID,
) -> Ok:
    """Soft-delete a gift by setting deleted_at."""
    gift = session.get(Gift, gift_id)
    if gift is None:
        raise HTTPException(status_code=404, detail="Gift not found")

    _require_contact_visible(session, current_user, gift.contact_id)

    gift.deleted_at = datetime.now(timezone.utc)
    session.add(gift)
    session.commit()
    return Ok()


@router.post("/{gift_id}/restore")
def restore_gift(
    session: SessionDep,
    current_user: CurrentUser,
    gift_id: uuid.UUID,
) -> Any:
    """Restore a soft-deleted gift by clearing deleted_at."""
    gift = session.get(Gift, gift_id)
    if gift is None or gift.deleted_at is None:
        raise HTTPException(status_code=404, detail="Gift not found or not deleted")

    _require_contact_visible(session, current_user, gift.contact_id)
    gift.deleted_at = None
    session.add(gift)
    session.commit()
    return {"ok": True}


@router.get("/kanban", response_model=dict)
def get_kanban_board(
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """Get gifts grouped by status for Kanban board view."""
    # Get all gifts for the current user with contact info
    statement = (
        select(Gift, Contact.birthday, Contact.first_name, Contact.last_name)
        .join(Contact, Gift.contact_id == Contact.id)
        .where(Gift.owner_id == current_user.id, Gift.deleted_at.is_(None))
    )
    results = session.exec(statement).all()

    # Group by status
    kanban_data = {
        status.value: {"gifts": [], "count": 0, "total_value": 0.0}
        for status in GiftStatus
    }

    for gift, birthday, first_name, last_name in results:
        days_until = _days_until_birthday(birthday)

        is_overdue = (
            days_until is not None
            and days_until < 3
            and gift.status in (GiftStatus.IDEA, GiftStatus.PURCHASED)
        )

        gift_data = GiftPublic(
            **gift.model_dump(),
            days_until_occasion=days_until,
            contact_birthday=birthday,
            contact_first_name=first_name,
            contact_last_name=last_name,
        )

        status_key = gift.status.value
        kanban_data[status_key]["gifts"].append(
            {
                "gift": gift_data.model_dump(),
                "is_overdue": is_overdue,
                "days_until_occasion": days_until,
            }
        )
        kanban_data[status_key]["count"] += 1
        if gift.value_amount:
            kanban_data[status_key]["total_value"] += gift.value_amount

    return kanban_data


@router.post("/{gift_id}/change-status", response_model=GiftPublic)
def change_gift_status(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    gift_id: uuid.UUID,
    new_status: GiftStatus,
) -> Any:
    """Change gift status (for drag-and-drop)."""
    gift = session.get(Gift, gift_id)
    if gift is None:
        raise HTTPException(status_code=404, detail="Gift not found")
    _require_contact_visible(session, current_user, gift.contact_id)

    gift.status = new_status
    # If moving to GIVEN, set gift_date to today if not set
    if new_status == GiftStatus.GIVEN and not gift.gift_date:
        gift.gift_date = date.today()

    session.add(gift)
    session.commit()
    session.refresh(gift)

    # Get contact info for response
    contact = session.get(Contact, gift.contact_id)
    days_until = _days_until_birthday(contact.birthday) if contact else None

    return GiftPublic(
        **gift.model_dump(),
        days_until_occasion=days_until,
        contact_birthday=contact.birthday if contact else None,
        contact_first_name=contact.first_name if contact else None,
        contact_last_name=contact.last_name if contact else None,
    )
