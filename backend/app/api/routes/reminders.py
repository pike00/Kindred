"""Reminder management routes."""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, or_, select

from app.api.deps import CurrentUser, SessionDep
from app.crud import contact_visible, create_reminder, visible_contact_ids
from app.models import (
    Contact,
    Reminder,
    ReminderContactSummary,
    ReminderCreate,
    ReminderDuePublic,
    ReminderPublic,
    RemindersDuePublic,
    ReminderSnoozeRequest,
    RemindersPublic,
    ReminderUpdate,
)

router = APIRouter(prefix="/reminders", tags=["reminders"])


def _reminder_accessible(user: Any, reminder: Reminder, session: Any) -> bool:
    if reminder.owner_id == user.id:
        return True
    if reminder.contact_id is None:
        return False
    return contact_visible(session=session, user=user, contact_id=reminder.contact_id)


@router.get("/", response_model=RemindersPublic)
def list_reminders(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
    is_active: bool | None = None,
) -> Any:
    """List reminders for the current user (owned + tied to visible contacts)."""
    statement = select(Reminder).where(
        or_(
            Reminder.owner_id == current_user.id,
            Reminder.contact_id.in_(visible_contact_ids(current_user)),
        )
    )

    if is_active is not None:
        statement = statement.where(Reminder.is_active == is_active)

    count_statement = select(func.count()).select_from(statement.subquery())
    count = session.exec(count_statement).one()

    statement = statement.order_by(Reminder.remind_at.desc()).offset(skip).limit(limit)
    reminders = session.exec(statement).all()

    return RemindersPublic(
        data=[ReminderPublic.model_validate(r) for r in reminders],
        count=count,
    )


@router.get("/due", response_model=RemindersDuePublic)
def list_due_reminders(
    session: SessionDep,
    current_user: CurrentUser,
    limit: int = 100,
) -> Any:
    """List reminders that are due now for the current user.

    A reminder is "due" when it is active, its `remind_at` is in the past,
    and it is not currently snoozed (`snoozed_until` is null or in the past).
    Results include the linked contact (when present) so the popover can
    render contact name without N+1 fetches. Ordered oldest-due first.
    """
    now = datetime.now(timezone.utc)

    statement = (
        select(Reminder, Contact)
        .join(Contact, Reminder.contact_id == Contact.id, isouter=True)  # type: ignore[arg-type]
        .where(
            Reminder.is_active.is_(True),  # type: ignore[union-attr]
            Reminder.remind_at <= now,
            or_(
                Reminder.snoozed_until.is_(None),  # type: ignore[union-attr]
                Reminder.snoozed_until <= now,
            ),
            or_(
                Reminder.owner_id == current_user.id,
                Reminder.contact_id.in_(visible_contact_ids(current_user)),  # type: ignore[union-attr]
            ),
        )
        .order_by(Reminder.remind_at.asc())  # type: ignore[union-attr]
        .limit(limit)
    )

    rows = session.exec(statement).all()

    data: list[ReminderDuePublic] = []
    for reminder, contact in rows:
        public = ReminderDuePublic.model_validate(reminder)
        if contact is not None:
            public.contact = ReminderContactSummary.model_validate(contact)
        data.append(public)

    return RemindersDuePublic(data=data, count=len(data))


@router.post("/", response_model=ReminderPublic)
def create_reminder_route(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    reminder_in: ReminderCreate,
) -> Any:
    """Create a new reminder."""
    if reminder_in.contact_id is not None and not contact_visible(
        session=session, user=current_user, contact_id=reminder_in.contact_id
    ):
        raise HTTPException(status_code=404, detail="Contact not found")
    reminder = create_reminder(
        session=session, reminder_in=reminder_in, owner_id=current_user.id
    )
    return ReminderPublic.model_validate(reminder)


@router.patch("/{reminder_id}", response_model=ReminderPublic)
def update_reminder(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    reminder_id: uuid.UUID,
    reminder_in: ReminderUpdate,
) -> Any:
    """Update a reminder."""
    reminder = session.get(Reminder, reminder_id)
    if reminder is None or not _reminder_accessible(current_user, reminder, session):
        raise HTTPException(status_code=404, detail="Reminder not found")

    update_data = reminder_in.model_dump(exclude_unset=True)
    reminder.sqlmodel_update(update_data)
    session.add(reminder)
    session.commit()
    session.refresh(reminder)
    return ReminderPublic.model_validate(reminder)


@router.post("/{reminder_id}/snooze", response_model=ReminderPublic)
def snooze_reminder(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    reminder_id: uuid.UUID,
    body: ReminderSnoozeRequest | None = None,
    minutes: int | None = None,
) -> Any:
    """Snooze a reminder.

    Accepts either a JSON body with ``snoozed_until`` (absolute UTC datetime) or
    ``minutes`` (relative duration), or a legacy ``?minutes=`` query parameter.
    Defaults to 30 minutes when nothing is provided.
    """
    reminder = session.get(Reminder, reminder_id)
    if reminder is None or not _reminder_accessible(current_user, reminder, session):
        raise HTTPException(status_code=404, detail="Reminder not found")

    target: datetime | None = None
    if body is not None and body.snoozed_until is not None:
        target = body.snoozed_until
        if target.tzinfo is None:
            target = target.replace(tzinfo=timezone.utc)
    else:
        body_minutes = body.minutes if body is not None else None
        effective_minutes = body_minutes if body_minutes is not None else minutes
        if effective_minutes is None:
            effective_minutes = 30
        target = datetime.now(timezone.utc) + timedelta(minutes=effective_minutes)

    reminder.snoozed_until = target
    session.add(reminder)
    session.commit()
    session.refresh(reminder)
    return ReminderPublic.model_validate(reminder)


_DISMISS_SENTINEL = datetime(9999, 12, 31, 23, 59, 59, tzinfo=timezone.utc)


@router.post("/{reminder_id}/dismiss", response_model=ReminderPublic)
def dismiss_reminder(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    reminder_id: uuid.UUID,
) -> Any:
    """Soft-clear a reminder from the badge.

    Bumps ``snoozed_until`` to a far-future sentinel so the reminder
    disappears from `/reminders/due` without being deleted. The reminder is
    still listed by `GET /reminders/` and can be re-enabled by editing it
    (clearing or shortening ``snoozed_until``).
    """
    reminder = session.get(Reminder, reminder_id)
    if reminder is None or not _reminder_accessible(current_user, reminder, session):
        raise HTTPException(status_code=404, detail="Reminder not found")

    reminder.snoozed_until = _DISMISS_SENTINEL
    session.add(reminder)
    session.commit()
    session.refresh(reminder)
    return ReminderPublic.model_validate(reminder)


@router.delete("/{reminder_id}")
def delete_reminder(
    session: SessionDep,
    current_user: CurrentUser,
    reminder_id: uuid.UUID,
) -> Any:
    """Soft-delete a reminder by setting deleted_at."""
    reminder = session.get(Reminder, reminder_id)
    if reminder is None or not _reminder_accessible(current_user, reminder, session):
        raise HTTPException(status_code=404, detail="Reminder not found")

    from datetime import datetime, timezone

    reminder.deleted_at = datetime.now(timezone.utc)
    session.add(reminder)
    session.commit()
    return {"ok": True}


@router.post("/{reminder_id}/restore")
def restore_reminder(
    session: SessionDep,
    reminder_id: uuid.UUID,
) -> Any:
    """Restore a soft-deleted reminder by clearing deleted_at."""
    from sqlalchemy import text, update

    result = session.exec(
        text("SELECT id FROM reminder WHERE id = :id AND deleted_at IS NOT NULL"),
        params={"id": str(reminder_id)},
    ).first()
    if result is None:
        raise HTTPException(status_code=404, detail="Reminder not found or not deleted")
    session.exec(
        update(Reminder).where(Reminder.id == reminder_id).values(deleted_at=None)
    )
    session.commit()
    return {"ok": True}
