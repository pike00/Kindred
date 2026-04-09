"""Tests for interaction management routes."""

import uuid
from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.core.config import settings


def _create_contact(client: TestClient, headers: dict[str, str]) -> str:
    """Helper to create a contact and return its ID."""
    r = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=headers,
        json={"first_name": f"IxTest-{uuid.uuid4().hex[:6]}"},
    )
    assert r.status_code == 200
    return r.json()["id"]


def test_create_interaction(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    contact_id = _create_contact(client, superuser_token_headers)
    data = {
        "contact_id": contact_id,
        "channel": "call",
        "occurred_at": datetime.now(timezone.utc).isoformat(),
        "notes": "Discussed project",
        "duration_minutes": 30,
    }
    r = client.post(
        f"{settings.API_V1_STR}/interactions/",
        headers=superuser_token_headers,
        json=data,
    )
    assert r.status_code == 200
    content = r.json()
    assert content["channel"] == "call"
    assert content["notes"] == "Discussed project"
    assert content["duration_minutes"] == 30
    assert content["contact_id"] == contact_id


def test_create_interaction_invalid_channel(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    contact_id = _create_contact(client, superuser_token_headers)
    data = {
        "contact_id": contact_id,
        "channel": "telepathy",
        "occurred_at": datetime.now(timezone.utc).isoformat(),
    }
    r = client.post(
        f"{settings.API_V1_STR}/interactions/",
        headers=superuser_token_headers,
        json=data,
    )
    assert r.status_code == 422


def test_create_interaction_invalid_contact(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    data = {
        "contact_id": str(uuid.uuid4()),
        "channel": "call",
        "occurred_at": datetime.now(timezone.utc).isoformat(),
    }
    r = client.post(
        f"{settings.API_V1_STR}/interactions/",
        headers=superuser_token_headers,
        json=data,
    )
    assert r.status_code == 404


def test_list_interactions(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    contact_id = _create_contact(client, superuser_token_headers)
    # Create two interactions
    for channel in ["call", "email"]:
        client.post(
            f"{settings.API_V1_STR}/interactions/",
            headers=superuser_token_headers,
            json={
                "contact_id": contact_id,
                "channel": channel,
                "occurred_at": datetime.now(timezone.utc).isoformat(),
            },
        )

    # List all
    r = client.get(
        f"{settings.API_V1_STR}/interactions/",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    assert r.json()["count"] >= 2

    # List by contact
    r = client.get(
        f"{settings.API_V1_STR}/interactions/",
        headers=superuser_token_headers,
        params={"contact_id": contact_id},
    )
    assert r.status_code == 200
    for ix in r.json()["data"]:
        assert ix["contact_id"] == contact_id


def test_update_interaction(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    contact_id = _create_contact(client, superuser_token_headers)
    r = client.post(
        f"{settings.API_V1_STR}/interactions/",
        headers=superuser_token_headers,
        json={
            "contact_id": contact_id,
            "channel": "call",
            "occurred_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    ix_id = r.json()["id"]

    r = client.patch(
        f"{settings.API_V1_STR}/interactions/{ix_id}",
        headers=superuser_token_headers,
        json={"notes": "Updated notes", "mood": "great"},
    )
    assert r.status_code == 200
    assert r.json()["notes"] == "Updated notes"
    assert r.json()["mood"] == "great"


def test_delete_interaction(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    contact_id = _create_contact(client, superuser_token_headers)
    r = client.post(
        f"{settings.API_V1_STR}/interactions/",
        headers=superuser_token_headers,
        json={
            "contact_id": contact_id,
            "channel": "email",
            "occurred_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    ix_id = r.json()["id"]

    r = client.delete(
        f"{settings.API_V1_STR}/interactions/{ix_id}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    assert r.json()["ok"] is True


def test_delete_interaction_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.delete(
        f"{settings.API_V1_STR}/interactions/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 404
