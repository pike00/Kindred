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
    Ok,
    Reminder,
    ReminderContactInfo,
    ReminderCreate,
    ReminderDuePublic,
    ReminderPublic,
    RemindersDuePublic,
    ReminderSnooze,
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
) -> RemindersPublic:
    """List reminders for the current user (owned + tied to visible contacts)."""
    statement = (
        select(Reminder)
        .where(
            or_(
                Reminder.owner_id == current_user.id,
                Reminder.contact_id.in_(visible_contact_ids(current_user)),
            )
        )
        .where(Reminder.deleted_at == None)  # noqa: E711
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
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """List reminders due now or overdue for the current user."""
    now = datetime.now(timezone.utc)

    base_filter = [
        Reminder.remind_at <= now,
        or_(
            Reminder.snoozed_until.is_(None),
            Reminder.snoozed_until <= now,
        ),
        Reminder.is_active.is_(True),
        or_(
            Reminder.owner_id == current_user.id,
            Reminder.contact_id.in_(visible_contact_ids(current_user)),
        ),
    ]

    count = session.exec(
        select(func.count()).select_from(
            select(Reminder.id).where(*base_filter).subquery()
        )
    ).one()

    results = session.exec(
        select(Reminder, Contact)
        .outerjoin(Contact, Reminder.contact_id == Contact.id)
        .where(*base_filter)
        .order_by(Reminder.remind_at.asc())
        .offset(skip)
        .limit(limit)
    ).all()

    due_list = []
    for reminder, contact in results:
        reminder_data = ReminderDuePublic.model_validate(reminder)
        if contact:
            reminder_data.contact_name = (
                f"{contact.first_name} {contact.last_name or ''}".strip()
            )
            reminder_data.contact = ReminderContactInfo(
                id=contact.id,
                first_name=contact.first_name,
                last_name=contact.last_name,
            )
        due_list.append(reminder_data)

    return RemindersDuePublic(data=due_list, count=count)


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

    reminder.snoozed_until = datetime.now(timezone.utc) + timedelta(days=365)
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
) -> ReminderPublic:
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
) -> ReminderPublic:
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
    minutes: int | None = None,
    body: ReminderSnoozeRequest | None = None,
) -> Any:
    """Snooze a reminder. Accepts JSON body with minutes/snooze_until, or minutes as query param."""
    reminder = session.get(Reminder, reminder_id)
    if reminder is None or not _reminder_accessible(current_user, reminder, session):
        raise HTTPException(status_code=404, detail="Reminder not found")

    now = datetime.now(timezone.utc)

    # Resolve snoozed_until from body or query param
    snooze_until = None
    snooze_minutes = None
    snooze_reason = None
    if body is not None:
        snooze_until = body.snoozed_until
        snooze_minutes = body.minutes
        snooze_reason = body.reason
    if minutes is not None:
        snooze_minutes = minutes

    if snooze_until is not None:
        new_snoozed_until = snooze_until
    elif snooze_minutes is not None:
        new_snoozed_until = now + timedelta(minutes=snooze_minutes)
    else:
        new_snoozed_until = now + timedelta(minutes=30)

    snooze_log = ReminderSnooze(
        reminder_id=reminder.id,
        snoozed_at=now,
        snoozed_until=new_snoozed_until,
        reason=snooze_reason,
    )
    session.add(snooze_log)

    reminder.snoozed_until = new_snoozed_until
    session.add(reminder)
    session.commit()
    session.refresh(reminder)
    return ReminderPublic.model_validate(reminder)


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
    return [
        {
            "snoozed_at": h.snoozed_at,
            "snoozed_until": h.snoozed_until,
            "reason": h.reason,
        }
        for h in history
    ]


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
    return Ok()
