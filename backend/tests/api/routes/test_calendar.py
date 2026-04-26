"""Tests for GET /calendar/month/{yyyy_mm} endpoint."""

import uuid
from datetime import date

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.models import Contact, LifeEvent


def _create_contact(
    db: Session,
    owner_id: uuid.UUID,
    first_name: str,
    last_name: str | None = None,
    birthday: date | None = None,
) -> Contact:
    contact = Contact(
        first_name=first_name,
        last_name=last_name,
        birthday=birthday,
        owner_id=owner_id,
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


def _create_life_event(
    db: Session,
    contact: Contact,
    owner_id: uuid.UUID,
    event_type: str,
    occurred_at: date,
    create_annual_reminder: bool = True,
) -> LifeEvent:
    event = LifeEvent(
        contact_id=contact.id,
        owner_id=owner_id,
        event_type=event_type,
        title=f"{event_type} event",
        occurred_at=occurred_at,
        create_annual_reminder=create_annual_reminder,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def _get_superuser_id(db: Session) -> uuid.UUID:
    from sqlmodel import select

    from app.models import User

    stmt = select(User).where(User.is_superuser == True)  # noqa: E712
    user = db.exec(stmt).first()
    assert user is not None, "Superuser not found in test DB"
    return user.id


# ─── Test 1: auth required ────────────────────────────────────────────────────


def test_calendar_month_requires_auth(client: TestClient) -> None:
    r = client.get(f"{settings.API_V1_STR}/calendar/month/2026-04")
    assert r.status_code == 401


# ─── Test 2: birthday appears on correct day with correct age ─────────────────


def test_calendar_month_birthday_appears(
    client: TestClient,
    superuser_token_headers: dict[str, str],
    db: Session,
) -> None:
    owner_id = _get_superuser_id(db)
    contact = _create_contact(
        db,
        owner_id=owner_id,
        first_name="Alice",
        last_name="Smith",
        birthday=date(1990, 4, 15),
    )

    r = client.get(
        f"{settings.API_V1_STR}/calendar/month/2026-04",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["month"] == "2026-04"

    day = "2026-04-15"
    assert day in body["days"], (
        f"Expected day {day} in days, got {list(body['days'].keys())}"
    )
    entries = body["days"][day]
    match = next((e for e in entries if e["contact_id"] == str(contact.id)), None)
    assert match is not None, f"Contact {contact.id} not found in entries: {entries}"
    assert match["name"] == "Alice Smith"
    assert match["type"] == "birthday"
    assert match["age"] == 36  # 2026 - 1990


# ─── Test 3: life event with create_annual_reminder=True appears ──────────────


def test_calendar_month_life_event_appears(
    client: TestClient,
    superuser_token_headers: dict[str, str],
    db: Session,
) -> None:
    owner_id = _get_superuser_id(db)
    contact = _create_contact(
        db,
        owner_id=owner_id,
        first_name="Bob",
        last_name="Jones",
    )
    _create_life_event(
        db,
        contact=contact,
        owner_id=owner_id,
        event_type="anniversary",
        occurred_at=date(2020, 4, 20),
        create_annual_reminder=True,
    )

    r = client.get(
        f"{settings.API_V1_STR}/calendar/month/2026-04",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    body = r.json()

    day = "2026-04-20"
    assert day in body["days"], f"Expected {day} in days"
    entries = body["days"][day]
    match = next(
        (
            e
            for e in entries
            if e["contact_id"] == str(contact.id) and e["type"] == "anniversary"
        ),
        None,
    )
    assert match is not None, f"Anniversary entry for {contact.id} not found: {entries}"
    assert match["name"] == "Bob Jones"
    assert match["age"] == 6  # 2026 - 2020


# ─── Test 4: birthday with year=1 returns age=null ───────────────────────────


def test_calendar_month_partial_birthday_no_age(
    client: TestClient,
    superuser_token_headers: dict[str, str],
    db: Session,
) -> None:
    owner_id = _get_superuser_id(db)
    contact = _create_contact(
        db,
        owner_id=owner_id,
        first_name="Carol",
        birthday=date(1, 4, 10),  # year=1 sentinel
    )

    r = client.get(
        f"{settings.API_V1_STR}/calendar/month/2026-04",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    body = r.json()

    day = "2026-04-10"
    assert day in body["days"]
    match = next(
        (e for e in body["days"][day] if e["contact_id"] == str(contact.id)), None
    )
    assert match is not None
    assert match["type"] == "birthday"
    assert match["age"] is None


# ─── Test 5: month with no events returns empty days dict ─────────────────────


def test_calendar_month_no_events_returns_empty(
    client: TestClient,
    superuser_token_headers: dict[str, str],
) -> None:
    r = client.get(
        f"{settings.API_V1_STR}/calendar/month/2099-12",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["month"] == "2099-12"
    assert body["days"] == {}


# ─── Test 6: invalid format returns 422 ──────────────────────────────────────


def test_calendar_month_invalid_format(
    client: TestClient,
    superuser_token_headers: dict[str, str],
) -> None:
    for bad in ["not-a-month", "2026-13", "2026-00", "26-04"]:
        r = client.get(
            f"{settings.API_V1_STR}/calendar/month/{bad}",
            headers=superuser_token_headers,
        )
        assert r.status_code == 422, f"Expected 422 for '{bad}', got {r.status_code}"
