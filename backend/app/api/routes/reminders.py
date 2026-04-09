"""Reminder management routes."""

import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.crud import create_reminder
from app.models import Reminder, ReminderCreate, ReminderPublic, ReminderUpdate, RemindersPublic

router = APIRouter(prefix="/reminders", tags=["reminders"])


@router.get("/", response_model=RemindersPublic)
def list_reminders(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
    is_active: bool | None = None,
) -> Any:
    """List reminders for the current user."""
    statement = select(Reminder).where(Reminder.owner_id == current_user.id)

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
    reminder = create_reminder(session=session, reminder_in=reminder_in, owner_id=current_user.id)
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
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    if reminder.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

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
) -> Any:
    """Snooze a reminder."""
    reminder = session.get(Reminder, reminder_id)
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    if reminder.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    from datetime import timedelta

    reminder.snoozed_until = datetime.now(timezone.utc) + timedelta(minutes=minutes)
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
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    if reminder.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    session.delete(reminder)
    session.commit()
    return {"ok": True}
