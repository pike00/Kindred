"""ARQ background worker for processing reminders, cadence checks, and search indexing."""

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

import apprise
from arq import cron
from arq.connections import RedisSettings
from sqlmodel import Session, create_engine, select

from app.core.config import settings

logger = logging.getLogger(__name__)
from app.email_service import poll_all_email_accounts  # noqa: E402
from app.models import (  # noqa: E402
    CommunicationPreference,
    Contact,
    Reminder,
    ReminderFrequency,
)


def _get_apprise() -> apprise.Apprise:
    """Initialize Apprise with configured notification URLs."""
    apobj = apprise.Apprise()
    if settings.APPRISE_URLS:
        for url in settings.APPRISE_URLS.split(","):
            url = url.strip()
            if url:
                apobj.add(url)
    return apobj


async def check_reminders(ctx: dict) -> None:
    """Check for due reminders and send notifications via Apprise."""
    engine = ctx["engine"]
    now = datetime.now(timezone.utc)

    with Session(engine) as session:
        due_reminders = session.exec(
            select(Reminder).where(
                Reminder.is_active.is_(True),
                Reminder.remind_at <= now,
                (Reminder.snoozed_until.is_(None)) | (Reminder.snoozed_until <= now),
            )
        ).all()

        if not due_reminders:
            return

        apobj = _get_apprise()

        for reminder in due_reminders:
            # Build notification
            title = f"Reminder: {reminder.title}"
            body = reminder.description or reminder.title

            if reminder.contact_id:
                contact = session.get(Contact, reminder.contact_id)
                if contact:
                    # Skip if do-not-contact is set
                    pref = session.exec(
                        select(CommunicationPreference).where(
                            CommunicationPreference.contact_id == contact.id
                        )
                    ).first()
                    if pref and pref.do_not_contact:
                        logger.info(
                            f"Skipping reminder {reminder.id}: "
                            f"contact {contact.id} has do-not-contact set"
                        )
                        continue
                    _ = f"{contact.first_name} {contact.last_name or ''}".strip()
            # Send notification (don't let failures corrupt scheduling)
            try:
                apobj.notify(title=title, body=body)
            except Exception as e:
                logger.error(
                    f"Failed to send notification for reminder {reminder.id}: {e}"
                )

            # Always update scheduling regardless of notification success
            reminder.last_sent_at = now

            # Handle recurring reminders
            if reminder.frequency == ReminderFrequency.ONCE:
                reminder.is_active = False
            else:
                delta_map = {
                    ReminderFrequency.DAILY: timedelta(days=1),
                    ReminderFrequency.WEEKLY: timedelta(weeks=1),
                    ReminderFrequency.MONTHLY: timedelta(days=30),
                    ReminderFrequency.YEARLY: timedelta(days=365),
                }
                reminder.remind_at = now + delta_map.get(
                    reminder.frequency, timedelta(days=1)
                )

            session.add(reminder)

        session.commit()


async def check_cadences(ctx: dict) -> None:
    """Check for contacts whose cadence has been exceeded and notify."""
    engine = ctx["engine"]
    now = datetime.now(timezone.utc)
    from zoneinfo import ZoneInfo

    def _contact_now(contact_tz: str | None) -> datetime:
        """Return current time in the contact's timezone, or UTC."""
        if contact_tz:
            try:
                return datetime.now(ZoneInfo(contact_tz))
            except Exception:
                pass
        return datetime.now(timezone.utc)

    with Session(engine) as session:
        contacts = session.exec(
            select(Contact).where(
                Contact.is_archived.is_(False),
                Contact.contact_frequency_days.is_not(None),
            )
        ).all()

        apobj = _get_apprise()

        for contact in contacts:
            # Skip if do-not-contact is set
            pref = session.exec(
                select(CommunicationPreference).where(
                    CommunicationPreference.contact_id == contact.id
                )
            ).first()
            if pref and pref.do_not_contact:
                continue

            if contact.snoozed_until and contact.snoozed_until > now:
                continue


            if contact.last_contacted_at is None:
                overdue = True
            else:
                # Compute deadline in UTC
                deadline = contact.last_contacted_at + timedelta(
                    days=contact.contact_frequency_days
                )
                # Get current time in contact's timezone
                contact_now = _contact_now(contact.timezone)
                # 9am in contact's local time, converted to UTC
                try:
                    local_tz = (
                        ZoneInfo(contact.timezone) if contact.timezone else timezone.utc
                    )
                except Exception:
                    local_tz = timezone.utc
                nine_am_local = contact_now.astimezone(local_tz).replace(
                    hour=9, minute=0, second=0, microsecond=0
                )
                nine_am_utc = nine_am_local.astimezone(timezone.utc)
                overdue = (now > deadline) and (now > nine_am_utc)
        if overdue:
            name = f"{contact.first_name} {contact.last_name or ''}".strip()
            try:
                apobj.notify(
                    title=f"Losing touch: {name}",
                    body=f"You haven't contacted {name} in over {contact.contact_frequency_days} days.",
                )
            except Exception as e:
                logger.error(
                    f"Failed to send cadence notification for contact {contact.id}: {e}"
                )


async def index_contact_in_search(
    ctx: dict,  # noqa: ARG001 (required by arq)
    contact_id: str,
    data: dict[str, Any],
) -> None:
    """Background task to index a contact in Meilisearch (non-blocking)."""
    try:
        from app.search import index_contact

        index_contact(contact_id, data)
    except Exception as e:
        # Log but don't fail the API response
        logger.warning(f"Failed to index contact {contact_id}: {e}")


async def remove_contact_from_search(
    ctx: dict,  # noqa: ARG001 (required by arq)
    contact_id: str,
) -> None:
    """Background task to remove a contact from Meilisearch (non-blocking)."""
    try:
        from app.search import remove_contact

        remove_contact(contact_id)
    except Exception as e:
        # Log but don't fail the API response
        logger.warning(f"Failed to remove contact {contact_id} from search: {e}")


async def poll_email_accounts(ctx: dict) -> None:
    """Poll all configured email accounts and create interactions."""
    from sqlmodel import Session

    engine = ctx["engine"]
    with Session(engine) as session:
        try:
            results = poll_all_email_accounts(session=session)
            total = sum(results.values())
            if total > 0:
                logger.info(f"Email poll created {total} new interaction(s)")
        except Exception as e:
            logger.error(f"Email poll failed: {e}")


class WorkerSettings:
    """ARQ worker settings."""

    functions = [
        check_reminders,
        check_cadences,
        index_contact_in_search,
        remove_contact_from_search,
        poll_email_accounts,
    ]
    cron_jobs = [
        cron(check_reminders, minute={0, 30}),  # Every 30 minutes
        cron(check_cadences, hour={9}, minute={0}),  # Daily at 9 AM UTC
        cron(poll_email_accounts, hour={6, 12, 18}, minute={0}),  # 6AM, noon, 6PM UTC
    ]
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)

    @staticmethod
    async def on_startup(ctx: dict) -> None:
        ctx["engine"] = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))
        if not settings.APPRISE_URLS:
            logger.warning("APPRISE_URLS is empty -- notifications are disabled")
