"""Reminder management routes."""
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, or_, select

from app.api.deps import CurrentUser, SessionDep
from app.crud import contact_visible, create_reminder, visible_contact_ids
from app.models import (
    Reminder,
    ReminderCreate,
    ReminderPublic,
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


@router.get("/due", response_model=RemindersPublic)
def list_due_reminders(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """List reminders due now or overdue for the current user.

    Filters for reminders where:
    - remind_at <= now (due or overdue)
    - snoozed_until is NULL or snoozed_until <= now (not snoozed)
    - is_active is True
    - owned by current user or tied to visible contacts
    """
    now = datetime.now(timezone.utc)

    statement = select(Reminder).where(
        Reminder.remind_at <= now,
        or_(
            Reminder.snoozed_until.is_(None),
            Reminder.snoozed_until <= now,
        ),
        Reminder.is_active == True,
        or_(
            Reminder.owner_id == current_user.id,
            Reminder.contact_id.in_(visible_contact_ids(current_user)),
        ),
    )

    count_statement = select(func.count()).select_from(statement.subquery())
    count = session.exec(count_statement).one()

    statement = statement.order_by(Reminder.remind_at.asc()).offset(skip).limit(limit)
    reminders = session.exec(statement).all()

    return RemindersPublic(
        data=[ReminderPublic.model_validate(r) for r in reminders],
        count=count,
    )


@router.post("/{reminder_id}/dismiss")
def dismiss_reminder(
    session: SessionDep,
    current_user: CurrentUser,
    reminder_id: uuid.UUID,
) -> Any:
    """Dismiss a reminder by setting snoozed_until to now (soft-clear from badge)."""
    reminder = session.get(Reminder, reminder_id)
    if reminder is None or not _reminder_accessible(current_user, reminder, session):
        raise HTTPException(status_code=404, detail="Reminder not found")

    reminder.snoozed_until = datetime.now(timezone.utc)
    session.add(reminder)
    session.commit()
    session.refresh(reminder)
    return ReminderPublic.model_validate(reminder)


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


@router.post("/{reminder_id}/snooze")
def snooze_reminder(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    reminder_id: uuid.UUID,
    minutes: int | None = None,
    snooze_until: datetime | None = None,
) -> Any:
    """Snooze a reminder.

    Provide either:
    - minutes: snooze for this many minutes from now
    - snooze_until: snooze until this specific datetime
    - neither: defaults to 1 hour
    """
    reminder = session.get(Reminder, reminder_id)
    if reminder is None or not _reminder_accessible(current_user, reminder, session):
        raise HTTPException(status_code=404, detail="Reminder not found")

    now = datetime.now(timezone.utc)
    if snooze_until is not None:
        reminder.snoozed_until = snooze_until
    elif minutes is not None:
        reminder.snoozed_until = now + timedelta(minutes=minutes)
    else:
        # Default: snooze for 1 hour
        reminder.snoozed_until = now + timedelta(hours=1)

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
    """Delete a reminder."""
    reminder = session.get(Reminder, reminder_id)
    if reminder is None or not _reminder_accessible(current_user, reminder, session):
        raise HTTPException(status_code=404, detail="Reminder not found")

    session.delete(reminder)
    session.commit()
    return {"ok": True}
