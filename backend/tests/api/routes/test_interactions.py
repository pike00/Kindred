"""Tests for interaction management routes."""

import uuid
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings


def _create_contact(
    client: TestClient, headers: dict[str, str], first_name: str | None = None
) -> str:
    """Helper to create a contact and return its ID."""
    body: dict[str, object] = {
        "first_name": first_name or f"IxTest-{uuid.uuid4().hex[:6]}"
    }
    r = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=headers,
        json=body,
    )
    assert r.status_code == 200
    return r.json()["id"]


def test_create_interaction_single_attendee(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    contact_id = _create_contact(client, superuser_token_headers)
    data = {
        "attendee_ids": [contact_id],
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
    assert [a["id"] for a in content["attendees"]] == [contact_id]


def test_create_interaction_multiple_attendees(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    alice_id = _create_contact(client, superuser_token_headers, "Alice")
    bob_id = _create_contact(client, superuser_token_headers, "Bob")
    charlie_id = _create_contact(client, superuser_token_headers, "Charlie")
    data = {
        "attendee_ids": [alice_id, bob_id, charlie_id],
        "channel": "in_person",
        "occurred_at": datetime.now(timezone.utc).isoformat(),
        "notes": "Trivia night",
    }
    r = client.post(
        f"{settings.API_V1_STR}/interactions/",
        headers=superuser_token_headers,
        json=data,
    )
    assert r.status_code == 200
    content = r.json()
    assert sorted(a["id"] for a in content["attendees"]) == sorted(
        [alice_id, bob_id, charlie_id]
    )

    # last_contacted_at bumped for all three
    for cid in (alice_id, bob_id, charlie_id):
        c = client.get(
            f"{settings.API_V1_STR}/contacts/{cid}",
            headers=superuser_token_headers,
        ).json()
        assert c["last_contacted_at"] is not None


def test_create_interaction_empty_attendees_rejected(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.post(
        f"{settings.API_V1_STR}/interactions/",
        headers=superuser_token_headers,
        json={
            "attendee_ids": [],
            "channel": "call",
            "occurred_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    assert r.status_code == 422


def test_create_interaction_invalid_channel(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    contact_id = _create_contact(client, superuser_token_headers)
    r = client.post(
        f"{settings.API_V1_STR}/interactions/",
        headers=superuser_token_headers,
        json={
            "attendee_ids": [contact_id],
            "channel": "telepathy",
            "occurred_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    assert r.status_code == 422


def test_create_interaction_unknown_contact(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.post(
        f"{settings.API_V1_STR}/interactions/",
        headers=superuser_token_headers,
        json={
            "attendee_ids": [str(uuid.uuid4())],
            "channel": "call",
            "occurred_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    assert r.status_code == 404


def test_list_interactions(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    contact_id = _create_contact(client, superuser_token_headers)
    for channel in ["call", "email"]:
        client.post(
            f"{settings.API_V1_STR}/interactions/",
            headers=superuser_token_headers,
            json={
                "attendee_ids": [contact_id],
                "channel": channel,
                "occurred_at": datetime.now(timezone.utc).isoformat(),
            },
        )

    r = client.get(
        f"{settings.API_V1_STR}/interactions/",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    assert r.json()["count"] >= 2

    r = client.get(
        f"{settings.API_V1_STR}/interactions/",
        headers=superuser_token_headers,
        params={"contact_id": contact_id},
    )
    assert r.status_code == 200
    for ix in r.json()["data"]:
        assert contact_id in [a["id"] for a in ix["attendees"]]


def test_list_per_contact_surfaces_multi_attendee(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    alice = _create_contact(client, superuser_token_headers, "Alice")
    bob = _create_contact(client, superuser_token_headers, "Bob")
    r = client.post(
        f"{settings.API_V1_STR}/interactions/",
        headers=superuser_token_headers,
        json={
            "attendee_ids": [alice, bob],
            "channel": "video",
            "occurred_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    ix_id = r.json()["id"]
    for cid in (alice, bob):
        r = client.get(
            f"{settings.API_V1_STR}/interactions/",
            headers=superuser_token_headers,
            params={"contact_id": cid},
        )
        ids = [ix["id"] for ix in r.json()["data"]]
        assert ix_id in ids


def test_update_interaction_attendees(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    alice = _create_contact(client, superuser_token_headers, "Alice")
    bob = _create_contact(client, superuser_token_headers, "Bob")
    charlie = _create_contact(client, superuser_token_headers, "Charlie")

    occurred = datetime.now(timezone.utc)
    r = client.post(
        f"{settings.API_V1_STR}/interactions/",
        headers=superuser_token_headers,
        json={
            "attendee_ids": [alice, bob],
            "channel": "call",
            "occurred_at": occurred.isoformat(),
        },
    )
    ix_id = r.json()["id"]

    r = client.patch(
        f"{settings.API_V1_STR}/interactions/{ix_id}",
        headers=superuser_token_headers,
        json={"attendee_ids": [alice, charlie]},
    )
    assert r.status_code == 200
    attendee_ids = sorted(a["id"] for a in r.json()["attendees"])
    assert attendee_ids == sorted([alice, charlie])

    # Bob is no longer on any interaction -> last_contacted_at should be None
    bob_contact = client.get(
        f"{settings.API_V1_STR}/contacts/{bob}",
        headers=superuser_token_headers,
    ).json()
    assert bob_contact["last_contacted_at"] is None


def test_update_interaction_scalar_fields(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    contact_id = _create_contact(client, superuser_token_headers)
    r = client.post(
        f"{settings.API_V1_STR}/interactions/",
        headers=superuser_token_headers,
        json={
            "attendee_ids": [contact_id],
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


def test_delete_interaction_recomputes_last_contacted(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    contact_id = _create_contact(client, superuser_token_headers)

    older = datetime.now(timezone.utc) - timedelta(days=10)
    newer = datetime.now(timezone.utc)
    client.post(
        f"{settings.API_V1_STR}/interactions/",
        headers=superuser_token_headers,
        json={
            "attendee_ids": [contact_id],
            "channel": "call",
            "occurred_at": older.isoformat(),
        },
    )
    r_new = client.post(
        f"{settings.API_V1_STR}/interactions/",
        headers=superuser_token_headers,
        json={
            "attendee_ids": [contact_id],
            "channel": "email",
            "occurred_at": newer.isoformat(),
        },
    )
    newer_id = r_new.json()["id"]

    # Delete the newer; last_contacted_at should roll back to the older one.
    r = client.delete(
        f"{settings.API_V1_STR}/interactions/{newer_id}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200

    c = client.get(
        f"{settings.API_V1_STR}/contacts/{contact_id}",
        headers=superuser_token_headers,
    ).json()
    assert c["last_contacted_at"] is not None
    # older date should win now
    assert c["last_contacted_at"].startswith(older.date().isoformat())


def test_delete_interaction_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.delete(
        f"{settings.API_V1_STR}/interactions/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 404


def test_interaction_isolation_between_users(client: TestClient, db: Session) -> None:
    from tests.utils.user import (
        authentication_token_from_email,
        create_random_user,
    )

    alice = create_random_user(db)
    bob = create_random_user(db)
    alice_h = authentication_token_from_email(client=client, email=alice.email, db=db)
    bob_h = authentication_token_from_email(client=client, email=bob.email, db=db)
    alice_cid = _create_contact(client, alice_h)

    ix = client.post(
        f"{settings.API_V1_STR}/interactions/",
        headers=alice_h,
        json={
            "attendee_ids": [alice_cid],
            "channel": "call",
            "occurred_at": datetime.now(timezone.utc).isoformat(),
        },
    ).json()

    r = client.get(f"{settings.API_V1_STR}/interactions/", headers=bob_h)
    assert r.status_code == 200
    assert ix["id"] not in [i["id"] for i in r.json()["data"]]

    r = client.patch(
        f"{settings.API_V1_STR}/interactions/{ix['id']}",
        headers=bob_h,
        json={"notes": "hacked"},
    )
    assert r.status_code == 404


def test_shared_tag_exposes_interaction(client: TestClient, db: Session) -> None:
    from tests.utils.user import (
        authentication_token_from_email,
        create_random_user,
    )

    alice = create_random_user(db)
    bob = create_random_user(db)
    alice_h = authentication_token_from_email(client=client, email=alice.email, db=db)
    bob_h = authentication_token_from_email(client=client, email=bob.email, db=db)

    tag = client.post(
        f"{settings.API_V1_STR}/tags/",
        headers=alice_h,
        json={"name": f"share-{uuid.uuid4().hex[:6]}"},
    ).json()
    shared = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=alice_h,
        json={"first_name": "Shared", "tag_ids": [tag["id"]]},
    ).json()
    private_contact = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=alice_h,
        json={"first_name": "Private"},
    ).json()
    ix = client.post(
        f"{settings.API_V1_STR}/interactions/",
        headers=alice_h,
        json={
            "attendee_ids": [shared["id"], private_contact["id"]],
            "channel": "call",
            "occurred_at": datetime.now(timezone.utc).isoformat(),
        },
    ).json()
    client.post(
        f"{settings.API_V1_STR}/tag-shares/",
        headers=alice_h,
        json={"tag_id": tag["id"], "grantee_id": str(bob.id)},
    )

    r = client.get(f"{settings.API_V1_STR}/interactions/", headers=bob_h)
    data = r.json()["data"]
    assert ix["id"] in [i["id"] for i in data]

    # Bob sees only the shared attendee; private contact is filtered out.
    bob_view = next(i for i in data if i["id"] == ix["id"])
    assert [a["id"] for a in bob_view["attendees"]] == [shared["id"]]
