"""Tests for the ICS calendar export feature."""

from datetime import date, datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.api.routes.calendar import _build_ics_feed, _get_token_owner
from app.models import (
    CalendarToken,
    Contact,
    LifeEvent,
    Reminder,
    ReminderFrequency,
    User,
)
from tests.utils.user import authentication_token_from_email
from tests.utils.utils import get_superuser_token_headers, random_email


@pytest.fixture(scope="module")
def user_token_headers(client: TestClient) -> dict[str, str]:
    """Get token headers for a test user."""
    email = random_email()
    return authentication_token_from_email(client=client, email=email, db=db)


@pytest.fixture(scope="module")
def superuser_token_headers(client: TestClient) -> dict[str, str]:
    """Get token headers for the superuser."""
    return get_superuser_token_headers(client)


@pytest.fixture(scope="module")
def test_user(db: Session, client: TestClient) -> User:
    """Create a test user."""
    from app import crud
    from tests.utils.utils import random_lower_string

    email = random_email()
    password = random_lower_string()
    user_in = User(email=email, hashed_password="test")  # type: ignore
    user = crud.create_user(session=db, user_create=user_in)
    return user


@pytest.fixture(scope="module")
def calendar_token(db: Session, test_user: User) -> CalendarToken:
    """Create a calendar token for the test user."""
    token = CalendarToken(
        owner_id=test_user.id,
        token="test-token-12345",
        status="active",
    )
    db.add(token)
    db.commit()
    db.refresh(token)
    return token


@pytest.fixture(scope="module")
def test_contact(db: Session, test_user: User) -> Contact:
    """Create a test contact with a birthday."""
    contact = Contact(
        first_name="John",
        last_name="Doe",
        birthday=date(1990, 5, 15),
        owner_id=test_user.id,
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


@pytest.fixture(scope="module")
def test_life_event(db: Session, test_user: User, test_contact: Contact) -> LifeEvent:
    """Create a test life event with annual reminder."""
    event = LifeEvent(
        event_type="wedding",
        title="Wedding Anniversary",
        occurred_at=date(2020, 6, 20),
        create_annual_reminder=True,
        contact_id=test_contact.id,
        owner_id=test_user.id,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@pytest.fixture(scope="module")
def test_reminder(db: Session, test_user: User, test_contact: Contact) -> Reminder:
    """Create a test reminder."""
    reminder = Reminder(
        title="Follow up with John",
        remind_at=datetime.now(timezone.utc) + timedelta(days=7),
        frequency=ReminderFrequency.ONCE,
        is_active=True,
        contact_id=test_contact.id,
        owner_id=test_user.id,
    )
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return reminder


class TestCalendarTokenManagement:
    """Tests for calendar token CRUD operations."""

    def test_create_calendar_token(
        self, client: TestClient, superuser_token_headers: dict[str, str]
    ):
        """Test creating a new calendar token."""
        response = client.post(
            "/api/v1/calendar/token",
            headers=superuser_token_headers,
            json={},
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["status"] == "active"
        assert data["owner_id"] is not None

    def test_list_calendar_tokens(
        self, client: TestClient, superuser_token_headers: dict[str, str]
    ):
        """Test listing calendar tokens."""
        response = client.get(
            "/api/v1/calendar/tokens",
            headers=superuser_token_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "count" in data

    def test_revoke_calendar_token(
        self, client: TestClient, superuser_token_headers: dict[str, str], db: Session
    ):
        """Test revoking a calendar token."""
        # First create a token
        create_response = client.post(
            "/api/v1/calendar/token",
            headers=superuser_token_headers,
            json={},
        )
        token_data = create_response.json()
        token_id = token_data["id"]

        # Revoke the token
        response = client.delete(
            f"/api/v1/calendar/token/{token_id}",
            headers=superuser_token_headers,
        )
        assert response.status_code == 200
        assert response.json()["message"] == "Token revoked successfully"

        # Verify token is revoked
        from app.models import CalendarToken as CT

        token = db.exec(select(CT).where(CT.id == token_id)).first()
        assert token is not None
        assert token.status == "revoked"


class TestICSFeed:
    """Tests for the ICS calendar feed endpoint."""

    def test_get_calendar_ics_no_token(self, client: TestClient):
        """Test accessing the ICS feed without a token returns 401."""
        response = client.get("/api/v1/calendar/calendar.ics")
        assert response.status_code == 401

    def test_get_calendar_ics_invalid_token(self, client: TestClient):
        """Test accessing the ICS feed with an invalid token returns 401."""
        response = client.get(
            "/api/v1/calendar/calendar.ics",
            headers={"Authorization": "Bearer invalid-token"},
        )
        assert response.status_code == 401

    def test_get_calendar_ics_valid_token(
        self,
        client: TestClient,
        calendar_token: CalendarToken,
        test_contact: Contact,
        test_life_event: LifeEvent,
    ):
        """Test accessing the ICS feed with a valid token."""
        response = client.get(
            "/api/v1/calendar/calendar.ics",
            headers={"Authorization": f"Bearer {calendar_token.token}"},
        )
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/calendar; charset=utf-8"
        assert "BEGIN:VCALENDAR" in response.text
        assert "END:VCALENDAR" in response.text

    def test_ics_contains_birthday(
        self,
        client: TestClient,
        calendar_token: CalendarToken,
        test_contact: Contact,
    ):
        """Test that the ICS feed contains birthday events."""
        response = client.get(
            "/api/v1/calendar/calendar.ics",
            headers={"Authorization": f"Bearer {calendar_token.token}"},
        )
        assert response.status_code == 200
        # Check for birthday event
        assert "BEGIN:VEVENT" in response.text
        assert "RRULE:FREQ=YEARLY" in response.text
        assert f"UID:birthday-{test_contact.id}@personal-crm" in response.text

    def test_ics_contains_life_event(
        self,
        client: TestClient,
        calendar_token: CalendarToken,
        test_life_event: LifeEvent,
    ):
        """Test that the ICS feed contains life event anniversaries."""
        response = client.get(
            "/api/v1/calendar/calendar.ics",
            headers={"Authorization": f"Bearer {calendar_token.token}"},
        )
        assert response.status_code == 200
        assert f"UID:lifeevent-{test_life_event.id}@personal-crm" in response.text

    def test_ics_contains_reminder(
        self,
        client: TestClient,
        calendar_token: CalendarToken,
        test_reminder: Reminder,
    ):
        """Test that the ICS feed contains active reminders."""
        response = client.get(
            "/api/v1/calendar/calendar.ics",
            headers={"Authorization": f"Bearer {calendar_token.token}"},
        )
        assert response.status_code == 200
        assert f"UID:reminder-{test_reminder.id}@personal-crm" in response.text

    def test_ics_has_etag_header(
        self,
        client: TestClient,
        calendar_token: CalendarToken,
    ):
        """Test that the ICS feed returns an ETag header."""
        response = client.get(
            "/api/v1/calendar/calendar.ics",
            headers={"Authorization": f"Bearer {calendar_token.token}"},
        )
        assert response.status_code == 200
        assert "etag" in response.headers

    def test_ics_has_last_modified_header(
        self,
        client: TestClient,
        calendar_token: CalendarToken,
    ):
        """Test that the ICS feed returns a Last-Modified header."""
        response = client.get(
            "/api/v1/calendar/calendar.ics",
            headers={"Authorization": f"Bearer {calendar_token.token}"},
        )
        assert response.status_code == 200
        assert "last-modified" in response.headers

    def test_revoked_token_returns_401(
        self, client: TestClient, db: Session, calendar_token: CalendarToken
    ):
        """Test that a revoked token returns 401."""
        # Revoke the token
        calendar_token.status = "revoked"
        calendar_token.revoked_at = datetime.now(timezone.utc)
        db.add(calendar_token)
        db.commit()

        response = client.get(
            "/api/v1/calendar/calendar.ics",
            headers={"Authorization": f"Bearer {calendar_token.token}"},
        )
        assert response.status_code == 401

        # Restore token for other tests
        calendar_token.status = "active"
        calendar_token.revoked_at = None
        db.add(calendar_token)
        db.commit()


class TestBuildICSFeeed:
    """Unit tests for the _build_ics_feed function."""

    def test_build_ics_feed_returns_valid_ical(
        self, db: Session, test_user: User, test_contact: Contact
    ):
        """Test that _build_ics_feed returns valid iCalendar data."""
        ics_string, etag, last_modified = _build_ics_feed(db, test_user)
        assert "BEGIN:VCALENDAR" in ics_string
        assert "VERSION:2.0" in ics_string
        assert "END:VCALENDAR" in ics_string

    def test_build_ics_feed_includes_birthdays(
        self, db: Session, test_user: User, test_contact: Contact
    ):
        """Test that birthdays are included in the feed."""
        ics_string, _, _ = _build_ics_feed(db, test_user)
        assert "John's Birthday" in ics_string or "Doe" in ics_string

    def test_build_ics_feed_etag_changes_with_content(
        self, db: Session, test_user: User
    ):
        """Test that ETag changes when content changes."""
        ics1, etag1, _ = _build_ics_feed(db, test_user)
        # After adding a new contact with birthday
        new_contact = Contact(
            first_name="Jane",
            last_name="Smith",
            birthday=date(1985, 3, 10),
            owner_id=test_user.id,
        )
        db.add(new_contact)
        db.commit()

        ics2, etag2, _ = _build_ics_feed(db, test_user)
        assert etag1 != etag2


class TestGetTokenOwner:
    """Unit tests for the _get_token_owner function."""

    def test_valid_token_returns_user(
        self, db: Session, test_user: User, calendar_token: CalendarToken
    ):
        """Test that a valid token returns the correct user."""
        user = _get_token_owner(db, calendar_token.token)
        assert user is not None
        assert user.id == test_user.id

    def test_invalid_token_returns_none(self, db: Session):
        """Test that an invalid token returns None."""
        user = _get_token_owner(db, "invalid-token")
        assert user is None

    def test_revoked_token_returns_none(
        self, db: Session, calendar_token: CalendarToken
    ):
        """Test that a revoked token returns None."""
        calendar_token.status = "revoked"
        db.add(calendar_token)
        db.commit()

        user = _get_token_owner(db, calendar_token.token)
        assert user is None

        # Restore
        calendar_token.status = "active"
        db.add(calendar_token)
        db.commit()
