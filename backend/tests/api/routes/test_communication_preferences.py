"""Tests for communication preference reminder suppression."""

import uuid
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.models import Reminder


def test_do_not_contact_preference_excludes_contact_and_clears_reminders(
    client: TestClient,
    db: Session,
    superuser_token_headers: dict[str, str],
) -> None:
    contact_response = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=superuser_token_headers,
        json={
            "first_name": "PreferenceSuppressed",
            "last_contacted_at": "2020-01-01T00:00:00Z",
            "contact_frequency_days": 7,
        },
    )
    assert contact_response.status_code == 200
    contact_id = contact_response.json()["id"]

    reminder_response = client.post(
        f"{settings.API_V1_STR}/reminders/",
        headers=superuser_token_headers,
        json={
            "title": "Preference follow-up",
            "remind_at": (
                datetime.now(timezone.utc) - timedelta(minutes=10)
            ).isoformat(),
            "contact_id": contact_id,
        },
    )
    assert reminder_response.status_code == 200

    preference_response = client.patch(
        f"{settings.API_V1_STR}/contacts/{contact_id}/communication-preference",
        headers=superuser_token_headers,
        json={"do_not_contact": True, "do_not_contact_reason": "Requested"},
    )
    assert preference_response.status_code == 200, preference_response.text
    assert preference_response.json()["do_not_contact"] is True

    overdue = client.get(
        f"{settings.API_V1_STR}/contacts/overdue",
        headers=superuser_token_headers,
    )
    losing_touch = client.get(
        f"{settings.API_V1_STR}/contacts/losing-touch",
        headers=superuser_token_headers,
    )
    assert contact_id not in [contact["id"] for contact in overdue.json()["data"]]
    assert contact_id not in [contact["id"] for contact in losing_touch.json()["data"]]

    reminder = db.get(Reminder, uuid.UUID(reminder_response.json()["id"]))
    assert reminder is not None
    assert reminder.deleted_at is not None
    assert reminder.is_active is False
