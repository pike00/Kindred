"""Tests for the activity log — before_flush listener and read endpoint."""

from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.core.config import settings

API = settings.API_V1_STR


# ── helpers ──────────────────────────────────────────────────────────────────


def _create_contact(client: TestClient, headers: dict) -> dict:
    r = client.post(f"{API}/contacts/", headers=headers, json={"first_name": "Audit"})
    assert r.status_code == 200
    return r.json()


def _get_logs(client: TestClient, headers: dict, **params) -> list[dict]:
    r = client.get(f"{API}/activity-logs/", headers=headers, params=params)
    assert r.status_code == 200
    return r.json()["data"]


# ── listener: contact create ──────────────────────────────────────────────────


def test_contact_create_produces_log(
    client: TestClient, superuser_token_headers: dict
) -> None:
    contact = _create_contact(client, superuser_token_headers)
    logs = _get_logs(
        client, superuser_token_headers, entity_type="contact", entity_id=contact["id"]
    )
    assert len(logs) == 1
    log = logs[0]
    assert log["entity_type"] == "contact"
    assert log["entity_id"] == contact["id"]
    assert log["action"] == "create"
    assert log["actor_id"] is not None


def test_contact_create_log_changes_json_contains_name(
    client: TestClient, superuser_token_headers: dict
) -> None:
    r = client.post(
        f"{API}/contacts/",
        headers=superuser_token_headers,
        json={"first_name": "Logged", "last_name": "Person"},
    )
    assert r.status_code == 200
    contact = r.json()
    logs = _get_logs(
        client, superuser_token_headers, entity_type="contact", entity_id=contact["id"]
    )
    assert len(logs) >= 1
    create_log = next(entry for entry in logs if entry["action"] == "create")
    assert create_log["changes_json"]["first_name"]["new"] == "Logged"
    assert create_log["changes_json"]["last_name"]["new"] == "Person"


# ── listener: contact update ──────────────────────────────────────────────────


def test_contact_update_produces_log(
    client: TestClient, superuser_token_headers: dict
) -> None:
    contact = _create_contact(client, superuser_token_headers)
    r = client.patch(
        f"{API}/contacts/{contact['id']}",
        headers=superuser_token_headers,
        json={"company": "Acme"},
    )
    assert r.status_code == 200
    logs = _get_logs(
        client, superuser_token_headers, entity_type="contact", entity_id=contact["id"]
    )
    update_logs = [entry for entry in logs if entry["action"] == "update"]
    assert len(update_logs) == 1
    assert update_logs[0]["changes_json"]["company"]["new"] == "Acme"
    assert update_logs[0]["changes_json"]["company"]["old"] is None


def test_contact_update_unchanged_fields_not_in_changes(
    client: TestClient, superuser_token_headers: dict
) -> None:
    contact = _create_contact(client, superuser_token_headers)
    client.patch(
        f"{API}/contacts/{contact['id']}",
        headers=superuser_token_headers,
        json={"company": "Beta"},
    )
    logs = _get_logs(
        client, superuser_token_headers, entity_type="contact", entity_id=contact["id"]
    )
    update_log = next(entry for entry in logs if entry["action"] == "update")
    assert "first_name" not in update_log["changes_json"]


# ── listener: contact delete ──────────────────────────────────────────────────


def test_contact_delete_produces_log(
    client: TestClient, superuser_token_headers: dict
) -> None:
    contact = _create_contact(client, superuser_token_headers)
    contact_id = contact["id"]
    r = client.delete(f"{API}/contacts/{contact_id}", headers=superuser_token_headers)
    assert r.status_code == 200
    logs = _get_logs(
        client, superuser_token_headers, entity_type="contact", entity_id=contact_id
    )
    delete_logs = [entry for entry in logs if entry["action"] == "delete"]
    assert len(delete_logs) == 1


# ── listener: interaction create (with attendees) ─────────────────────────────


def test_interaction_create_produces_log_with_attendees(
    client: TestClient, superuser_token_headers: dict
) -> None:
    contact = _create_contact(client, superuser_token_headers)
    r = client.post(
        f"{API}/interactions/",
        headers=superuser_token_headers,
        json={
            "attendee_ids": [contact["id"]],
            "channel": "in_person",
            "occurred_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    assert r.status_code == 200
    interaction_id = r.json()["id"]
    logs = _get_logs(
        client,
        superuser_token_headers,
        entity_type="interaction",
        entity_id=interaction_id,
    )
    assert len(logs) >= 1
    create_log = next(entry for entry in logs if entry["action"] == "create")
    assert str(contact["id"]) in [
        str(a) for a in create_log["changes_json"]["attendees"]
    ]


# ── listener: interaction attendee update ─────────────────────────────────────


def test_interaction_update_attendees_produces_update_attendees_log(
    client: TestClient, superuser_token_headers: dict
) -> None:
    contact_a = _create_contact(client, superuser_token_headers)
    contact_b = _create_contact(client, superuser_token_headers)
    r = client.post(
        f"{API}/interactions/",
        headers=superuser_token_headers,
        json={
            "attendee_ids": [contact_a["id"]],
            "channel": "in_person",
            "occurred_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    interaction_id = r.json()["id"]

    # Add contact_b, remove contact_a
    client.patch(
        f"{API}/interactions/{interaction_id}",
        headers=superuser_token_headers,
        json={"attendee_ids": [contact_b["id"]]},
    )

    logs = _get_logs(
        client,
        superuser_token_headers,
        entity_type="interaction",
        entity_id=interaction_id,
    )
    attendee_logs = [entry for entry in logs if entry["action"] == "update_attendees"]
    assert len(attendee_logs) == 1
    log = attendee_logs[0]
    assert str(contact_b["id"]) in [str(a) for a in log["changes_json"]["added"]]
    assert str(contact_a["id"]) in [str(a) for a in log["changes_json"]["removed"]]


# ── read endpoint: visibility scoping ────────────────────────────────────────


def test_activity_logs_only_returns_own_data(
    client: TestClient,
    superuser_token_headers: dict,
) -> None:
    contact = _create_contact(client, superuser_token_headers)
    logs = _get_logs(
        client, superuser_token_headers, entity_type="contact", entity_id=contact["id"]
    )
    for log in logs:
        assert log["entity_id"] == contact["id"]


def test_activity_logs_occurred_at_is_set(
    client: TestClient, superuser_token_headers: dict
) -> None:
    contact = _create_contact(client, superuser_token_headers)
    logs = _get_logs(
        client, superuser_token_headers, entity_type="contact", entity_id=contact["id"]
    )
    assert len(logs) >= 1
    assert logs[0]["occurred_at"] is not None
    # Must parse as ISO datetime (Python 3.10 fromisoformat doesn't accept Z)
    datetime.fromisoformat(logs[0]["occurred_at"].replace("Z", "+00:00"))
