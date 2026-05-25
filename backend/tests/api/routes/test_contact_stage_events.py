"""Tests for contact stage event routes."""

import uuid
from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings


def test_create_stage_event(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test creating a stage event for a contact."""
    # Create a contact first
    r = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=superuser_token_headers,
        json={"first_name": "StageTest", "stage": "Active"},
    )
    assert r.status_code == 200
    contact_id = r.json()["id"]

    # Create a stage event
    r = client.post(
        f"{settings.API_V1_STR}/contacts/{contact_id}/stage-events",
        headers=superuser_token_headers,
        json={
            "contact_id": contact_id,
            "from_stage": "Active",
            "to_stage": "Dormant",
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "note": "Moving to dormant",
        },
    )
    assert r.status_code == 200
    content = r.json()
    assert content["contact_id"] == contact_id
    assert content["from_stage"] == "Active"
    assert content["to_stage"] == "Dormant"
    assert content["note"] == "Moving to dormant"


def test_create_stage_event_auto_from_stage(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test that from_stage is auto-populated if not provided."""
    # Create a contact
    r = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=superuser_token_headers,
        json={"first_name": "AutoStage", "stage": "Active"},
    )
    assert r.status_code == 200
    contact_id = r.json()["id"]

    # Create first stage event (seed)
    r = client.post(
        f"{settings.API_V1_STR}/contacts/{contact_id}/stage-events",
        headers=superuser_token_headers,
        json={
            "contact_id": contact_id,
            "to_stage": "Dormant",
            "occurred_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    assert r.status_code == 200
    assert r.json()["from_stage"] == "Active"

    # Create second stage event without from_stage
    r = client.post(
        f"{settings.API_V1_STR}/contacts/{contact_id}/stage-events",
        headers=superuser_token_headers,
        json={
            "contact_id": contact_id,
            "to_stage": "Lost",
            "occurred_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    assert r.status_code == 200
    assert r.json()["from_stage"] == "Dormant"
    assert r.json()["to_stage"] == "Lost"


def test_create_stage_event_contact_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test creating a stage event for non-existent contact."""
    fake_id = str(uuid.uuid4())
    r = client.post(
        f"{settings.API_V1_STR}/contacts/{fake_id}/stage-events",
        headers=superuser_token_headers,
        json={
            "contact_id": fake_id,
            "to_stage": "Dormant",
            "occurred_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    assert r.status_code == 404


def test_create_stage_event_id_mismatch(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test that contact_id in path and body must match."""
    r = client.post(
        f"{settings.API_V1_STR}/contacts/{uuid.uuid4()}/stage-events",
        headers=superuser_token_headers,
        json={
            "contact_id": str(uuid.uuid4()),  # Different ID
            "to_stage": "Dormant",
            "occurred_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    assert r.status_code == 400


def test_list_stage_history(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test listing stage history for a contact."""
    # Create a contact
    r = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=superuser_token_headers,
        json={"first_name": "HistoryTest", "stage": "Active"},
    )
    assert r.status_code == 200
    contact_id = r.json()["id"]

    # Create some stage events
    for to_stage in ["Dormant", "Lost", "Active"]:
        r = client.post(
            f"{settings.API_V1_STR}/contacts/{contact_id}/stage-events",
            headers=superuser_token_headers,
            json={
                "contact_id": contact_id,
                "to_stage": to_stage,
                "occurred_at": datetime.now(timezone.utc).isoformat(),
            },
        )
        assert r.status_code == 200

    # List stage history
    r = client.get(
        f"{settings.API_V1_STR}/contacts/{contact_id}/stage-history",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    content = r.json()
    assert "data" in content
    assert "count" in content
    assert content["count"] >= 3  # At least 3 events (possibly more with seed)


def test_list_stage_history_contact_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test listing stage history for non-existent contact."""
    fake_id = str(uuid.uuid4())
    r = client.get(
        f"{settings.API_V1_STR}/contacts/{fake_id}/stage-history",
        headers=superuser_token_headers,
    )
    assert r.status_code == 404


def test_get_latest_stage(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test getting the latest stage event for a contact."""
    # Create a contact
    r = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=superuser_token_headers,
        json={"first_name": "LatestTest", "stage": "Active"},
    )
    assert r.status_code == 200
    contact_id = r.json()["id"]

    # Create a stage event
    r = client.post(
        f"{settings.API_V1_STR}/contacts/{contact_id}/stage-events",
        headers=superuser_token_headers,
        json={
            "contact_id": contact_id,
            "to_stage": "Dormant",
            "occurred_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    assert r.status_code == 200

    # Get latest stage
    r = client.get(
        f"{settings.API_V1_STR}/contacts/{contact_id}/stage-history/latest",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    content = r.json()
    assert content["to_stage"] == "Dormant"


def test_get_latest_stage_no_events(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test getting latest stage when no events exist (before backfill)."""
    # Create a contact
    r = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=superuser_token_headers,
        json={"first_name": "NoEvents"},
    )
    assert r.status_code == 200
    contact_id = r.json()["id"]

    # Try to get latest stage (should fail as no events yet)
    r = client.get(
        f"{settings.API_V1_STR}/contacts/{contact_id}/stage-history/latest",
        headers=superuser_token_headers,
    )
    # Without backfill, there are no events
    assert r.status_code == 404


def test_get_stage_duration(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test getting stage duration for a specific stage."""
    # Create a contact
    r = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=superuser_token_headers,
        json={"first_name": "DurationTest", "stage": "Active"},
    )
    assert r.status_code == 200
    contact_id = r.json()["id"]

    # Get stage duration for "Active" stage
    r = client.get(
        f"{settings.API_V1_STR}/contacts/{contact_id}/stage-duration/Active",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    # Returns a list of (entered_at, exited_at, duration_seconds) tuples
    assert isinstance(r.json(), list)


def test_backfill_stage_events(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test backfilling seed stage events."""
    # Create a contact without explicit stage events
    r = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=superuser_token_headers,
        json={"first_name": "BackfillTest", "stage": "Active"},
    )
    assert r.status_code == 200

    # Run backfill
    r = client.post(
        f"{settings.API_V1_STR}/contacts/backfill-stage-events",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    content = r.json()
    assert "created" in content
    assert content["created"] >= 1

    # Running again should be idempotent
    r = client.post(
        f"{settings.API_V1_STR}/contacts/backfill-stage-events",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    assert r.json()["created"] == 0


def test_update_contact_creates_stage_event(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test that updating a contact's stage creates a stage event."""
    # Create a contact
    r = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=superuser_token_headers,
        json={"first_name": "UpdateStage", "stage": "Active"},
    )
    assert r.status_code == 200
    contact_id = r.json()["id"]

    # Update the stage
    r = client.patch(
        f"{settings.API_V1_STR}/contacts/{contact_id}",
        headers=superuser_token_headers,
        json={"stage": "Dormant"},
    )
    assert r.status_code == 200
    assert r.json()["stage"] == "Dormant"

    # Check that a stage event was created
    r = client.get(
        f"{settings.API_V1_STR}/contacts/{contact_id}/stage-history",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    events = r.json()["data"]
    assert len(events) >= 1
    # Find the event with from_stage="Active" and to_stage="Dormant"
    found = False
    for event in events:
        if event["from_stage"] == "Active" and event["to_stage"] == "Dormant":
            found = True
            break
    assert found, "Expected stage event from Active to Dormant"


def test_stage_event_isolation_between_users(client: TestClient, db: Session) -> None:
    """Test that users can only see their own contacts' stage events."""
    from tests.utils.user import (
        authentication_token_from_email,
        create_random_user,
    )

    alice = create_random_user(db)
    bob = create_random_user(db)
    alice_h = authentication_token_from_email(client=client, email=alice.email, db=db)
    bob_h = authentication_token_from_email(client=client, email=bob.email, db=db)

    # Alice creates a contact
    r = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=alice_h,
        json={"first_name": "AliceContact", "stage": "Active"},
    )
    assert r.status_code == 200
    alice_contact_id = r.json()["id"]

    # Bob should not be able to see Alice's contact stage history
    r = client.get(
        f"{settings.API_V1_STR}/contacts/{alice_contact_id}/stage-history",
        headers=bob_h,
    )
    assert r.status_code == 404
