"""Calendar endpoint: birthdays and annual life events by month."""

import re
import secrets
import uuid
from datetime import date, datetime, timedelta, timezone
from email.utils import format_datetime
from hashlib import md5
from typing import Any
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from icalendar import Alarm, Calendar, Event, vRecur, vText
from sqlmodel import Session, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    CalendarEntry,
    CalendarMonthResponse,
    CalendarToken,
    CalendarTokenCreate,
    CalendarTokenPublic,
    CalendarTokensPublic,
    Contact,
    LifeEvent,
    Reminder,
    User,
)

bearer_scheme = HTTPBearer(auto_error=False)

router = APIRouter(prefix="/calendar", tags=["calendar"])

_MONTH_RE = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")


@router.get("/month/{yyyy_mm}", response_model=CalendarMonthResponse)
def get_calendar_month(
    session: SessionDep,
    current_user: CurrentUser,
    yyyy_mm: str,
) -> CalendarMonthResponse:
    if not _MONTH_RE.match(yyyy_mm):
        raise HTTPException(
            status_code=422, detail="Invalid month format; expected YYYY-MM"
        )
    year, month = int(yyyy_mm[:4]), int(yyyy_mm[5:])
    days: dict[str, list[CalendarEntry]] = {}

    # Birthdays
    contacts = session.exec(
        select(Contact).where(
            Contact.owner_id == current_user.id,
            Contact.birthday.is_not(None),  # type: ignore[union-attr]
        )
    ).all()
    for contact in contacts:
        if contact.birthday and contact.birthday.month == month:
            day_key = date(year, month, contact.birthday.day).isoformat()
            age = None if contact.birthday.year <= 1 else year - contact.birthday.year
            name = f"{contact.first_name} {contact.last_name or ''}".strip()
            days.setdefault(day_key, []).append(
                CalendarEntry(
                    contact_id=contact.id, name=name, type="birthday", age=age
                )
            )

    # Annual life events
    events = session.exec(
        select(LifeEvent).where(
            LifeEvent.owner_id == current_user.id,
            LifeEvent.create_annual_reminder.is_(True),  # type: ignore[union-attr]
        )
    ).all()
    for event in events:
        if event.occurred_at.month == month:
            day_key = date(year, month, event.occurred_at.day).isoformat()
            age = year - event.occurred_at.year
            contact = session.get(Contact, event.contact_id)
            name = (
                f"{contact.first_name} {contact.last_name or ''}".strip()
                if contact
                else "Unknown"
            )
            days.setdefault(day_key, []).append(
                CalendarEntry(
                    contact_id=event.contact_id,
                    name=name,
                    type=event.event_type,
                    age=age,
                )
            )

    return CalendarMonthResponse(month=yyyy_mm, days=days)


# ─── Calendar Token Management ─────────────────────────────────────────────

@router.post("/token", response_model=CalendarTokenPublic)
def create_calendar_token(
    session: SessionDep,
    current_user: CurrentUser,
    token_in: CalendarTokenCreate,
) -> Any:
    """Create a new calendar token for ICS feed access."""
    token_value = secrets.token_urlsafe(32)
    calendar_token = CalendarToken(
        owner_id=current_user.id,
        token=token_value,
        expires_at=token_in.expires_at,
    )
    session.add(calendar_token)
    session.commit()
    session.refresh(calendar_token)
    return calendar_token


@router.get("/tokens", response_model=CalendarTokensPublic)
def list_calendar_tokens(
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """List all calendar tokens for the current user."""
    tokens = session.exec(
        select(CalendarToken).where(CalendarToken.owner_id == current_user.id)
    ).all()
    return CalendarTokensPublic(data=tokens, count=len(tokens))


@router.delete("/token/{token_id}")
def revoke_calendar_token(
    session: SessionDep,
    current_user: CurrentUser,
    token_id: uuid.UUID,
) -> Any:
    """Revoke a calendar token (soft delete by setting status to revoked)."""
    token = session.get(CalendarToken, token_id)
    if not token or token.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Token not found")
    token.status = "revoked"
    token.revoked_at = datetime.now(timezone.utc)
    session.add(token)
    session.commit()
    return {"message": "Token revoked successfully"}


# ─── ICS Feed Endpoint ────────────────────────────────────────────────────


def _get_token_owner(session: Session, token: str) -> User | None:
    """Validate the bearer token and return the owning user."""
    calendar_token = session.exec(
        select(CalendarToken).where(
            CalendarToken.token == token,
            CalendarToken.status == "active",
        )
    ).first()
    if not calendar_token:
        return None
    if calendar_token.expires_at and calendar_token.expires_at < datetime.now(
        timezone.utc
    ):
        return None
    user = session.get(User, calendar_token.owner_id)
    if not user or not user.is_active:
        return None
    # Update last_used_at
    calendar_token.last_used_at = datetime.now(timezone.utc)
    session.add(calendar_token)
    session.commit()
    return user


def _build_ics_feed(
    session: Session,
    user: User,
    tz_param: str | None = None,
) -> tuple[str, str, datetime]:
    """Build the ICS calendar feed and return (ics_string, etag, last_modified).

    Args:
        session: Database session
        user: The owner user
        tz_param: Optional timezone parameter (e.g., "America/Chicago")

    Returns:
        Tuple of (ics_string, etag_hash, last_modified)
    """
    cal = Calendar()
    cal.add("prodid", "-//Personal CRM//Calendar Export//EN")
    cal.add("version", "2.0")
    cal.add("calscale", "GREGORIAN")
    cal.add("method", "PUBLISH")
    cal.add("x-wr-calname", vText(f"Personal CRM - {user.full_name or user.email}"))

    # Determine output timezone if specified
    output_tz = None
    if tz_param:
        try:
            output_tz = ZoneInfo(tz_param)
        except Exception:
            # Invalid timezone name; ignore and fall back to UTC
            output_tz = None

    # Track last modified for ETag
    last_modified = datetime.now(timezone.utc)

    # ── Birthdays ────────────────────────────────────────────────────────
    contacts = session.exec(
        select(Contact).where(
            Contact.owner_id == user.id,
            Contact.birthday.is_not(None),  # type: ignore[union-attr]
        )
    ).all()

    for contact in contacts:
        if not contact.birthday:
            continue
        name = f"{contact.first_name} {contact.last_name or ''}".strip()

        # Create VEVENT with RRULE=FREQ=YEARLY for birthdays
        event = Event()
        event.add("uid", f"birthday-{contact.id}@personal-crm")
        event.add("summary", f"{name}'s Birthday")
        # Birthdays are all-day events (DATE value); no timezone conversion needed
        event.add("dtstart", contact.birthday)  # DATE value for all-day
        event.add("dtstamp", datetime.now(timezone.utc))

        # Add RRULE for yearly recurrence
        recur = vRecur()
        recur["freq"] = "YEARLY"
        event.add("rrule", recur)

        # Add age to description if year is meaningful
        if contact.birthday.year > 1:
            event.add("description", f"Birthday for {name}")

        cal.add_component(event)

        # Track last_modified
        if contact.updated_at and contact.updated_at > last_modified:
            last_modified = contact.updated_at

    # ── Life Events with Annual Reminders ────────────────────────────────
    events = session.exec(
        select(LifeEvent).where(
            LifeEvent.owner_id == user.id,
            LifeEvent.create_annual_reminder.is_(True),  # type: ignore[union-attr]
        )
    ).all()

    for life_event in events:
        contact = session.get(Contact, life_event.contact_id)
        name = (
            f"{contact.first_name} {contact.last_name or ''}".strip()
            if contact
            else "Unknown"
        )
        event_name = f"{life_event.event_type}: {life_event.title}"
        if contact:
            event_name = f"{name} - {life_event.title}"

        event = Event()
        event.add("uid", f"lifeevent-{life_event.id}@personal-crm")
        event.add("summary", event_name)
        # Life events are all-day events (DATE value)
        event.add("dtstart", life_event.occurred_at)  # DATE value
        event.add("dtstamp", datetime.now(timezone.utc))

        # Add RRULE for yearly recurrence
        recur = vRecur()
        recur["freq"] = "YEARLY"
        event.add("rrule", recur)

        if life_event.description:
            event.add("description", life_event.description)

        cal.add_component(event)

        if life_event.created_at and life_event.created_at > last_modified:
            last_modified = life_event.created_at

    # ── Active Reminders ──────────────────────────────────────────────────
    reminders = session.exec(
        select(Reminder).where(
            Reminder.owner_id == user.id,
            Reminder.is_active.is_(True),  # type: ignore[union-attr]
        )
    ).all()

    for reminder in reminders:
        event = Event()
        uid = f"reminder-{reminder.id}@personal-crm"
        event.add("uid", uid)
        event.add("summary", reminder.title)

        # Handle recurrence based on frequency
        # Apply timezone conversion if specified
        if output_tz and reminder.remind_at:
            dt = reminder.remind_at.astimezone(output_tz)
        else:
            dt = reminder.remind_at
        event.add("dtstart", dt)

        if reminder.frequency != "once":
            recur = vRecur()
            freq_map = {
                "daily": "DAILY",
                "weekly": "WEEKLY",
                "monthly": "MONTHLY",
                "yearly": "YEARLY",
            }
            recur["freq"] = freq_map.get(reminder.frequency.value, "DAILY")
            event.add("rrule", recur)

        event.add("dtstamp", datetime.now(timezone.utc))

        if reminder.description:
            event.add("description", reminder.description)

        # Add VALARM for reminder
        alarm = Alarm()
        alarm.add("action", "DISPLAY")
        alarm.add("description", f"Reminder: {reminder.title}")
        alarm.add("trigger", timedelta(hours=-24))  # Default: 24 hours before
        event.add_component(alarm)

        cal.add_component(event)

        if reminder.last_sent_at and reminder.last_sent_at > last_modified:
            last_modified = reminder.last_sent_at
        if reminder.created_at and reminder.created_at > last_modified:
            last_modified = reminder.created_at

    ics_string = cal.to_ical().decode("utf-8")
    etag = f'"{md5(ics_string.encode()).hexdigest()}"'

    return ics_string, etag, last_modified


@router.get("/calendar.ics")
def get_calendar_ics(
    session: SessionDep,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    tz: str | None = Query(
        None, description="Optional timezone for output (e.g., America/Chicago)"
    ),
) -> Response:
    """Return the ICS calendar feed for the authenticated user via bearer token."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Missing authorization token")

    user = _get_token_owner(session, credentials.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    ics_string, etag, last_modified = _build_ics_feed(session, user, tz)

    headers = {
        "Content-Type": "text/calendar; charset=utf-8",
        "ETag": etag,
        "Last-Modified": format_datetime(last_modified),
        "Cache-Control": "private, max-age=3600",
    }

    return Response(content=ics_string, headers=headers)
