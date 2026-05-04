"""Reminder management routes."""

import uuid
from datetime import datetime, timezone
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
    ReminderSnooze,
    ReminderUpdate,
    ReminderSnooze,
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
    minutes: int = 30,
    reason: str | None = None,
) -> Any:
    """Snooze a reminder: write a log row and update denormalized snoozed_until."""
    reminder = session.get(Reminder, reminder_id)
    if reminder is None or not _reminder_accessible(current_user, reminder, session):
        raise HTTPException(status_code=404, detail="Reminder not found")

    from datetime import timedelta

    now = datetime.now(timezone.utc)
    new_snoozed_until = now + timedelta(minutes=minutes)

    # Write snooze log row
    snooze_log = ReminderSnooze(
        reminder_id=reminder.id,
        snoozed_at=now,
        snoozed_until=new_snoozed_until,
        reason=reason,
    )
    session.add(snooze_log)

    # Update denormalized cache on Reminder
    reminder.snoozed_until = new_snoozed_until
    session.add(reminder)

    session.commit()
    session.refresh(reminder)
    return ReminderPublic.model_validate(reminder)




from datetime import timedelta
from app.crud import get_effective_snoozed_until


@router.get("/{reminder_id}/snooze-history")
def get_snooze_history(
    session: SessionDep,
    current_user: CurrentUser,
    reminder_id: uuid.UUID,
) -> Any:
    """Get snooze history for a reminder."""
    reminder = session.get(Reminder, reminder_id)
    if reminder is None or not _reminder_accessible(current_user, reminder, session):
        raise HTTPException(status_code=404, detail="Reminder not found")

    stmt = (
        select(ReminderSnooze)
        .where(ReminderSnooze.reminder_id == reminder_id)
        .order_by(ReminderSnooze.snoozed_at.desc())
    )
    history = session.exec(stmt).all()
    return [{"snoozed_at": h.snoozed_at, "snoozed_until": h.snoozed_until, "reason": h.reason} for h in history]


@router.get("/snooze-stats")
def get_snooze_stats(
    session: SessionDep,
    current_user: CurrentUser,
    days: int = 30,
) -> Any:
    """Get snooze count per reminder in the last N days."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    stmt = (
        select(
            ReminderSnooze.reminder_id,
            func.count(ReminderSnooze.id).label("snooze_count"),
        )
        .join(Reminder, ReminderSnooze.reminder_id == Reminder.id)
        .where(
            ReminderSnooze.snoozed_at >= cutoff,
            or_(
                Reminder.owner_id == current_user.id,
                Reminder.contact_id.in_(visible_contact_ids(current_user)),
            ),
        )
        .group_by(ReminderSnooze.reminder_id)
    )
    results = session.exec(stmt).all()
    return [{"reminder_id": str(r[0]), "snooze_count": r[1]} for r in results]


@router.get("/chronic-snoozers")
def get_chronic_snoozers(
    session: SessionDep,
    current_user: CurrentUser,
    days: int = 7,
    threshold: int = 3,
) -> Any:
    """Get contacts with reminders snoozed more than threshold times in N days."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    stmt = (
        select(
            Reminder.contact_id,
            Reminder.id.label("reminder_id"),
            func.count(ReminderSnooze.id).label("snooze_count"),
        )
        .join(ReminderSnooze, ReminderSnooze.reminder_id == Reminder.id)
        .where(
            ReminderSnooze.snoozed_at >= cutoff,
            or_(
                Reminder.owner_id == current_user.id,
                Reminder.contact_id.in_(visible_contact_ids(current_user)),
            ),
        )
        .group_by(Reminder.contact_id, Reminder.id)
        .having(func.count(ReminderSnooze.id) > threshold)
    )
    results = session.exec(stmt).all()
    return [
        {
            "contact_id": str(r[0]) if r[0] else None,
            "reminder_id": str(r[1]),
            "snooze_count": r[2],
        }
        for r in results
    ]


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
