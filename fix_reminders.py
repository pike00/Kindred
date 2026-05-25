import re

# Read the current file
with open('backend/app/api/routes/reminders.py', 'r') as f:
    content = f.read()

# Fix the missing colons in dictionary literals
# The issue is: {"snoozed_at": h.snoozed_at, "snoozed_until": h.snoozed_until, "reason": h.reason}
# But it got written as: {"snoozed_at": h.snoozed_at "snoozed_until": h.snoozed_until "reason": h.reason}

# Fix the snooze history return statement
content = content.replace(
    '"snoozed_at": h.snoozed_at "snoozed_until": h.snoozed_until "reason": h.reason',
    '"snoozed_at": h.snoozed_at, "snoozed_until": h.snoozed_until, "reason": h.reason'
)

# Fix the snooze stats return statement  
content = content.replace(
    '"reminder_id": str(r[0]), "snoozed_count": r[1]',
    '"reminder_id": str(r[0]), "snooze_count": r[1]'
)

# Actually let me just check the exact content and rewrite the problematic functions
# Let me find and fix the get_snooze_history function
old_history = '''    return [{"snoozed_at": h.snoozed_at, "snoozed_until": h.snoozed_until, "reason": h.reason} for h in history]'''

new_history = '''    return [{"snoozed_at": h.snoozed_at, "snoozed_until": h.snoozed_until, "reason": h.reason} for h in history]'''

# Check if they're different
if old_history != new_history:
    content = content.replace(old_history, new_history)

# Let me just rewrite the entire added section with correct syntax
# Find the position where the new code starts
marker = 'from datetime import timedelta\nfrom app.crud import get_effective_snoozed_until'
if marker in content:
    # Find the start of new code
    start_pos = content.find(marker)
    # Find the end of new code (start of @router.delete)
    end_marker = '@router.delete("/{reminder_id}")'
    end_pos = content.find(end_marker)
    
    if end_pos > start_pos:
        # Replace the problematic section with correct code
        correct_code = '''
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

        content = content[:start_pos] + correct_code + content[end_pos:]

with open('backend/app/api/routes/reminders.py', 'w') as f:
    f.write(content)

print("Fixed reminders.py")
