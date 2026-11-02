"""ARQ background worker for processing reminders, cadence checks, and search indexing."""

import logging
from datetime import datetime, timedelta, timezone
from typing import Any
from zoneinfo import ZoneInfo

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
    await _check_reminders(ctx, now=datetime.now(timezone.utc))


async def _claim_job(redis: Any, key: str, ttl_seconds: int) -> bool:
    if redis is None:
        return True
    return bool(await redis.set(key, "1", nx=True, ex=ttl_seconds))


async def _release_job_claim(redis: Any, key: str) -> None:
    if redis is not None:
        await redis.delete(key)


async def _check_reminders(ctx: dict, *, now: datetime) -> None:
    engine = ctx["engine"]
    redis = ctx.get("redis")

    with Session(engine) as session:
        due_reminders = session.exec(
            select(Reminder).where(
                Reminder.is_active.is_(True),
                Reminder.deleted_at.is_(None),
                Reminder.remind_at <= now,
                (Reminder.snoozed_until.is_(None)) | (Reminder.snoozed_until <= now),
            )
        ).all()

        if not due_reminders:
            return

        apobj = _get_apprise()

        for reminder in due_reminders:
            claim_key = f"kindred:reminder-delivery:{reminder.id}"
            if not await _claim_job(redis, claim_key, ttl_seconds=300):
                continue

            # Build notification
            title = f"Reminder: {reminder.title}"
            body = reminder.description or reminder.title

            if reminder.contact_id:
                contact = session.get(Contact, reminder.contact_id)
                if contact is None or contact.deleted_at is not None:
                    reminder.is_active = False
                    session.add(reminder)
                    session.commit()
                    await _release_job_claim(redis, claim_key)
                    continue
                if contact.do_not_contact:
                    logger.info(
                        "Skipping reminder %s: contact %s has reminders paused",
                        reminder.id,
                        contact.id,
                    )
                    reminder.is_active = False
                    session.add(reminder)
                    session.commit()
                    await _release_job_claim(redis, claim_key)
                    continue
                pref = session.exec(
                    select(CommunicationPreference).where(
                        CommunicationPreference.contact_id == contact.id
                    )
                ).first()
                if pref and pref.do_not_contact:
                    logger.info(
                        "Skipping reminder %s: contact %s has do-not-contact set",
                        reminder.id,
                        contact.id,
                    )
                    reminder.is_active = False
                    session.add(reminder)
                    session.commit()
                    await _release_job_claim(redis, claim_key)
                    continue
                contact_name = f"{contact.first_name} {contact.last_name or ''}".strip()
                body = f"{contact_name}: {body}" if contact_name else body

            # Send notification (don't let failures corrupt scheduling)
            delivered = False
            try:
                delivered = bool(apobj.notify(title=title, body=body))
            except Exception as e:
                logger.error(
                    f"Failed to send notification for reminder {reminder.id}: {e}"
                )

            if not delivered:
                await _release_job_claim(redis, claim_key)
                session.commit()
                continue

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
            await _release_job_claim(redis, claim_key)


async def check_cadences(ctx: dict) -> None:
    """Check for contacts whose cadence has been exceeded and notify."""
    await _check_cadences(ctx, now=datetime.now(timezone.utc))


def _contact_now(contact_tz: str | None, now: datetime) -> datetime:
    """Return now in the contact's timezone, or UTC when unknown."""
    if contact_tz:
        try:
            return now.astimezone(ZoneInfo(contact_tz))
        except Exception:
            pass
    return now


async def _check_cadences(ctx: dict, *, now: datetime) -> None:
    engine = ctx["engine"]
    redis = ctx.get("redis")

    with Session(engine) as session:
        contacts = session.exec(
            select(Contact).where(
                Contact.is_archived.is_(False),
                Contact.contact_frequency_days.is_not(None),
                Contact.deleted_at.is_(None),
            )
        ).all()

        apobj = _get_apprise()

        for contact in contacts:
            # Skip if do-not-contact is set
            if contact.do_not_contact:
                continue
            pref = session.exec(
                select(CommunicationPreference).where(
                    CommunicationPreference.contact_id == contact.id
                )
            ).first()
            if pref and pref.do_not_contact:
                continue

            if contact.snoozed_until and contact.snoozed_until > now:
                continue

            contact_now = _contact_now(contact.timezone, now)
            if contact_now.hour < 9:
                continue

            if contact.last_contacted_at is None:
                overdue = True
            else:
                # Compute deadline in UTC
                deadline = contact.last_contacted_at + timedelta(
                    days=contact.contact_frequency_days
                )
                overdue = now > deadline

            if not overdue:
                continue

            claim_key = f"kindred:cadence:{contact.id}:{contact_now.date().isoformat()}"
            if not await _claim_job(redis, claim_key, ttl_seconds=172800):
                continue

            name = f"{contact.first_name} {contact.last_name or ''}".strip()
            try:
                delivered = bool(
                    apobj.notify(
                        title=f"Losing touch: {name}",
                        body=(
                            f"You haven't contacted {name} in over "
                            f"{contact.contact_frequency_days} days."
                        ),
                    )
                )
                if not delivered:
                    await _release_job_claim(redis, claim_key)
            except Exception as e:
                await _release_job_claim(redis, claim_key)
                logger.error(
                    "Failed to send cadence notification for contact %s: %s",
                    contact.id,
                    e,
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
        cron(check_cadences, minute={0}),  # Hourly; each contact is gated at local 9 AM
        cron(poll_email_accounts, hour={6, 12, 18}, minute={0}),  # 6AM, noon, 6PM UTC
    ]
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)

    @staticmethod
    async def on_startup(ctx: dict) -> None:
        ctx["engine"] = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))
        if not settings.APPRISE_URLS:
            logger.warning("APPRISE_URLS is empty -- notifications are disabled")
