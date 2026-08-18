"""Tests for the activity log — before_flush listener and read endpoint."""

from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from tests.utils.user import authentication_token_from_email, create_random_user

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


# ── TagShare visibility scoping ───────────────────────────────────────────────


def _setup_share(client: TestClient, db: Session) -> tuple[dict, dict, dict, dict]:
    """Create alice+bob, alice's contact+tag, share tag with bob. Return (c, tag, alice_h, bob_h)."""
    alice = create_random_user(db)
    bob = create_random_user(db)
    alice_h = authentication_token_from_email(client=client, email=alice.email, db=db)
    bob_h = authentication_token_from_email(client=client, email=bob.email, db=db)

    contact = client.post(
        f"{API}/contacts/", headers=alice_h, json={"first_name": "Shared"}
    ).json()
    tag = client.post(
        f"{API}/tags/", headers=alice_h, json={"name": "share-tag"}
    ).json()
    client.patch(
        f"{API}/contacts/{contact['id']}",
        headers=alice_h,
        json={"tag_ids": [tag["id"]]},
    )
    client.post(
        f"{API}/tag-shares/",
        headers=alice_h,
        json={"tag_id": tag["id"], "grantee_id": str(bob.id)},
    )
    return contact, tag, alice_h, bob_h


def test_grantee_sees_shared_contact_logs(client: TestClient, db: Session) -> None:
    contact, _tag, _alice_h, bob_h = _setup_share(client, db)
    r = client.get(
        f"{API}/activity-logs/",
        headers=bob_h,
        params={"entity_type": "contact", "entity_id": contact["id"]},
    )
    assert r.status_code == 200
    assert r.json()["count"] >= 1


def test_grantee_does_not_see_unshared_contact_logs(
    client: TestClient, db: Session
) -> None:
    alice = create_random_user(db)
    bob = create_random_user(db)
    alice_h = authentication_token_from_email(client=client, email=alice.email, db=db)
    bob_h = authentication_token_from_email(client=client, email=bob.email, db=db)

    contact = client.post(
        f"{API}/contacts/", headers=alice_h, json={"first_name": "Private"}
    ).json()

    r = client.get(
        f"{API}/activity-logs/",
        headers=bob_h,
        params={"entity_type": "contact", "entity_id": contact["id"]},
    )
    assert r.status_code == 200
    assert r.json()["count"] == 0


def test_tag_id_filter_scopes_to_tagged_contacts(
    client: TestClient, db: Session
) -> None:
    contact, tag, alice_h, bob_h = _setup_share(client, db)

    # Alice creates a second contact NOT tagged
    c2 = client.post(
        f"{API}/contacts/", headers=alice_h, json={"first_name": "Untagged"}
    ).json()

    r = client.get(f"{API}/activity-logs/", headers=bob_h, params={"tag_id": tag["id"]})
    assert r.status_code == 200
    entity_ids = {entry["entity_id"] for entry in r.json()["data"]}
    assert contact["id"] in entity_ids
    assert c2["id"] not in entity_ids


def test_tag_id_filter_forbidden_for_non_grantee(
    client: TestClient, db: Session
) -> None:
    alice = create_random_user(db)
    charlie = create_random_user(db)
    alice_h = authentication_token_from_email(client=client, email=alice.email, db=db)
    charlie_h = authentication_token_from_email(
        client=client, email=charlie.email, db=db
    )

    tag = client.post(
        f"{API}/tags/", headers=alice_h, json={"name": "private-tag"}
    ).json()

    r = client.get(
        f"{API}/activity-logs/", headers=charlie_h, params={"tag_id": tag["id"]}
    )
    assert r.status_code == 403


def test_grantor_sees_all_contacts_share_create_and_delete_logs(
    client: TestClient, db: Session
) -> None:
    alice = create_random_user(db)
    bob = create_random_user(db)
    alice_h = authentication_token_from_email(client=client, email=alice.email, db=db)

    create_response = client.post(
        f"{API}/contact-shares/",
        headers=alice_h,
        json={"grantee_id": str(bob.id)},
    )
    assert create_response.status_code == 200

    delete_response = client.delete(f"{API}/contact-shares/{bob.id}", headers=alice_h)
    assert delete_response.status_code == 200

    logs = _get_logs(
        client,
        alice_h,
        entity_type="AllContactsShare",
        entity_id=bob.id,
    )
    actions = [entry["action"] for entry in logs]
    assert actions.count("create") == 1
    assert actions.count("delete") == 1
    for entry in logs:
        assert entry["changes_json"]["scope"] == "all_contacts"
        assert entry["changes_json"]["grantee_id"] == str(bob.id)
        assert entry["changes_json"]["grantee_email"] == bob.email


def test_other_user_cannot_inspect_grantors_all_contacts_share_logs(
    client: TestClient, db: Session
) -> None:
    alice = create_random_user(db)
    bob = create_random_user(db)
    charlie = create_random_user(db)
    alice_h = authentication_token_from_email(client=client, email=alice.email, db=db)
    charlie_h = authentication_token_from_email(
        client=client, email=charlie.email, db=db
    )

    create_response = client.post(
        f"{API}/contact-shares/",
        headers=alice_h,
        json={"grantee_id": str(bob.id)},
    )
    assert create_response.status_code == 200

    r = client.get(
        f"{API}/activity-logs/",
        headers=charlie_h,
        params={"entity_type": "AllContactsShare", "entity_id": str(bob.id)},
    )
    assert r.status_code == 200
    assert r.json()["count"] == 0
