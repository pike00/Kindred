"""Calendar endpoint: birthdays and annual life events by month."""

import re
from datetime import date

from fastapi import APIRouter, HTTPException
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.models import CalendarEntry, CalendarMonthResponse, Contact, LifeEvent

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
