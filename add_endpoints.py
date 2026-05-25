import re

# Read the current file
with open('backend/app/api/routes/reminders.py', 'r') as f:
    content = f.read()

# New endpoints to add before the delete endpoint
new_endpoints = '''
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


'''

# Find the position to insert (before @router.delete)
delete_pattern = r'(@router\.delete\("/\{reminder_id\}"\))'
match = re.search(delete_pattern, content)
if match:
    insert_pos = match.start()
    new_content = content[:insert_pos] + new_endpoints + content[insert_pos:]

    with open('backend/app/api/routes/reminders.py', 'w') as f:
        f.write(new_content)
    print("Successfully added new endpoints to reminders.py")
else:
    print("Could not find the delete endpoint pattern")
