"""Tests for the reminder routes — /due endpoint, snooze, dismiss."""

import uuid
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from app.core.config import settings


def _create_contact(client: TestClient, headers: dict[str, str]) -> str:
    body = {"first_name": f"Rem-{uuid.uuid4().hex[:6]}", "last_name": "Tester"}
    r = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=headers,
        json=body,
    )
    assert r.status_code == 200, r.text
    return r.json()["id"]


def _create_reminder(
    client: TestClient,
    headers: dict[str, str],
    *,
    title: str,
    remind_at: datetime,
    contact_id: str | None = None,
    is_active: bool = True,
) -> dict:
    body: dict[str, object] = {
        "title": title,
        "remind_at": remind_at.isoformat(),
        "is_active": is_active,
    }
    if contact_id is not None:
        body["contact_id"] = contact_id
    r = client.post(
        f"{settings.API_V1_STR}/reminders/",
        headers=headers,
        json=body,
    )
    assert r.status_code == 200, r.text
    return r.json()


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ── /reminders/due ───────────────────────────────────────────────────────────


def test_due_returns_overdue_active_reminders(
    client: TestClient,
    superuser_token_headers: dict[str, str],
) -> None:
    contact_id = _create_contact(client, superuser_token_headers)
    overdue = _create_reminder(
        client,
        superuser_token_headers,
        title="Overdue ping",
        remind_at=_now() - timedelta(hours=2),
        contact_id=contact_id,
    )
    # Future reminder — should NOT appear
    _create_reminder(
        client,
        superuser_token_headers,
        title="Future ping",
        remind_at=_now() + timedelta(hours=2),
        contact_id=contact_id,
    )

    r = client.get(
        f"{settings.API_V1_STR}/reminders/due",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    ids = [item["id"] for item in body["data"]]
    assert overdue["id"] in ids
    assert body["count"] == len(body["data"])


def test_due_excludes_inactive(
    client: TestClient,
    superuser_token_headers: dict[str, str],
) -> None:
    inactive = _create_reminder(
        client,
        superuser_token_headers,
        title="Inactive overdue",
        remind_at=_now() - timedelta(hours=1),
        is_active=False,
    )
    r = client.get(
        f"{settings.API_V1_STR}/reminders/due",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    ids = [item["id"] for item in r.json()["data"]]
    assert inactive["id"] not in ids


def test_due_excludes_snoozed_into_future(
    client: TestClient,
    superuser_token_headers: dict[str, str],
) -> None:
    rem = _create_reminder(
        client,
        superuser_token_headers,
        title="Will snooze",
        remind_at=_now() - timedelta(hours=1),
    )
    # Snooze 1 hour ahead
    r = client.post(
        f"{settings.API_V1_STR}/reminders/{rem['id']}/snooze",
        headers=superuser_token_headers,
        json={"minutes": 60},
    )
    assert r.status_code == 200, r.text

    r = client.get(
        f"{settings.API_V1_STR}/reminders/due",
        headers=superuser_token_headers,
    )
    ids = [item["id"] for item in r.json()["data"]]
    assert rem["id"] not in ids


def test_due_includes_contact_summary(
    client: TestClient,
    superuser_token_headers: dict[str, str],
) -> None:
    contact_id = _create_contact(client, superuser_token_headers)
    rem = _create_reminder(
        client,
        superuser_token_headers,
        title="With contact",
        remind_at=_now() - timedelta(minutes=10),
        contact_id=contact_id,
    )
    r = client.get(
        f"{settings.API_V1_STR}/reminders/due",
        headers=superuser_token_headers,
    )
    matched = next((x for x in r.json()["data"] if x["id"] == rem["id"]), None)
    assert matched is not None
    assert matched["contact"] is not None
    assert matched["contact"]["id"] == contact_id
    assert matched["contact"]["last_name"] == "Tester"


def test_due_handles_standalone_reminder(
    client: TestClient,
    superuser_token_headers: dict[str, str],
) -> None:
    rem = _create_reminder(
        client,
        superuser_token_headers,
        title="Standalone",
        remind_at=_now() - timedelta(minutes=5),
    )
    r = client.get(
        f"{settings.API_V1_STR}/reminders/due",
        headers=superuser_token_headers,
    )
    matched = next((x for x in r.json()["data"] if x["id"] == rem["id"]), None)
    assert matched is not None
    assert matched["contact"] is None


def test_due_orders_oldest_first(
    client: TestClient,
    superuser_token_headers: dict[str, str],
) -> None:
    older = _create_reminder(
        client,
        superuser_token_headers,
        title="Older",
        remind_at=_now() - timedelta(hours=5),
    )
    newer = _create_reminder(
        client,
        superuser_token_headers,
        title="Newer",
        remind_at=_now() - timedelta(minutes=5),
    )
    r = client.get(
        f"{settings.API_V1_STR}/reminders/due",
        headers=superuser_token_headers,
    )
    ids = [item["id"] for item in r.json()["data"]]
    assert older["id"] in ids and newer["id"] in ids
    assert ids.index(older["id"]) < ids.index(newer["id"])


# ── snooze body shapes ───────────────────────────────────────────────────────


def test_snooze_with_absolute_datetime(
    client: TestClient,
    superuser_token_headers: dict[str, str],
) -> None:
    rem = _create_reminder(
        client,
        superuser_token_headers,
        title="Snooze abs",
        remind_at=_now() - timedelta(minutes=10),
    )
    target = _now() + timedelta(hours=4)
    r = client.post(
        f"{settings.API_V1_STR}/reminders/{rem['id']}/snooze",
        headers=superuser_token_headers,
        json={"snoozed_until": target.isoformat()},
    )
    assert r.status_code == 200, r.text
    assert r.json()["snoozed_until"] is not None


def test_snooze_legacy_query_param_still_works(
    client: TestClient,
    superuser_token_headers: dict[str, str],
) -> None:
    rem = _create_reminder(
        client,
        superuser_token_headers,
        title="Snooze legacy",
        remind_at=_now() - timedelta(minutes=10),
    )
    r = client.post(
        f"{settings.API_V1_STR}/reminders/{rem['id']}/snooze?minutes=15",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200, r.text
    assert r.json()["snoozed_until"] is not None


# ── dismiss ──────────────────────────────────────────────────────────────────


def test_dismiss_clears_from_due_list(
    client: TestClient,
    superuser_token_headers: dict[str, str],
) -> None:
    rem = _create_reminder(
        client,
        superuser_token_headers,
        title="Will dismiss",
        remind_at=_now() - timedelta(minutes=20),
    )

    # Confirm it shows up first
    r = client.get(
        f"{settings.API_V1_STR}/reminders/due",
        headers=superuser_token_headers,
    )
    assert rem["id"] in [x["id"] for x in r.json()["data"]]

    # Dismiss
    r = client.post(
        f"{settings.API_V1_STR}/reminders/{rem['id']}/dismiss",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["snoozed_until"] is not None

    # Should no longer be in /due
    r = client.get(
        f"{settings.API_V1_STR}/reminders/due",
        headers=superuser_token_headers,
    )
    assert rem["id"] not in [x["id"] for x in r.json()["data"]]


def test_dismiss_unknown_reminder_returns_404(
    client: TestClient,
    superuser_token_headers: dict[str, str],
) -> None:
    r = client.post(
        f"{settings.API_V1_STR}/reminders/{uuid.uuid4()}/dismiss",
        headers=superuser_token_headers,
    )
    assert r.status_code == 404
