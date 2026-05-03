"""Tests for life event management routes."""

import uuid
from datetime import date

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings


def _create_contact(
    client: TestClient, headers: dict[str, str], first_name: str | None = None
) -> str:
    body: dict[str, object] = {
        "first_name": first_name or f"LifeTest-{uuid.uuid4().hex[:6]}"
    }
    r = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=headers,
        json=body,
    )
    assert r.status_code == 200
    return r.json()["id"]


def test_create_life_event_minimal(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    contact_id = _create_contact(client, superuser_token_headers)
    r = client.post(
        f"{settings.API_V1_STR}/life-events/",
        headers=superuser_token_headers,
        json={
            "contact_id": contact_id,
            "event_type": "birthday",
            "title": "Born",
            "occurred_at": "1990-04-12",
        },
    )
    assert r.status_code == 200
    content = r.json()
    assert content["contact_id"] == contact_id
    assert content["event_type"] == "birthday"
    assert content["title"] == "Born"
    assert content["occurred_at"] == "1990-04-12"
    assert content["create_annual_reminder"] is False
    assert "id" in content
    assert "created_at" in content


def test_create_life_event_full(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    contact_id = _create_contact(client, superuser_token_headers)
    r = client.post(
        f"{settings.API_V1_STR}/life-events/",
        headers=superuser_token_headers,
        json={
            "contact_id": contact_id,
            "event_type": "wedding",
            "title": "Got married",
            "description": "Vermont, summer ceremony",
            "occurred_at": "2020-06-15",
            "create_annual_reminder": True,
        },
    )
    assert r.status_code == 200
    content = r.json()
    assert content["description"] == "Vermont, summer ceremony"
    assert content["create_annual_reminder"] is True


def test_create_life_event_missing_required_422(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    contact_id = _create_contact(client, superuser_token_headers)
    r = client.post(
        f"{settings.API_V1_STR}/life-events/",
        headers=superuser_token_headers,
        json={"contact_id": contact_id, "event_type": "move"},
    )
    assert r.status_code == 422


def test_create_life_event_unknown_contact_404(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.post(
        f"{settings.API_V1_STR}/life-events/",
        headers=superuser_token_headers,
        json={
            "contact_id": str(uuid.uuid4()),
            "event_type": "birthday",
            "title": "Ghost",
            "occurred_at": "2000-01-01",
        },
    )
    assert r.status_code == 404


def test_list_life_events(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    contact_id = _create_contact(client, superuser_token_headers)
    client.post(
        f"{settings.API_V1_STR}/life-events/",
        headers=superuser_token_headers,
        json={
            "contact_id": contact_id,
            "event_type": "birthday",
            "title": "Born",
            "occurred_at": "1990-04-12",
        },
    )
    client.post(
        f"{settings.API_V1_STR}/life-events/",
        headers=superuser_token_headers,
        json={
            "contact_id": contact_id,
            "event_type": "graduation",
            "title": "Graduated",
            "occurred_at": "2012-05-20",
        },
    )

    r = client.get(
        f"{settings.API_V1_STR}/life-events/contact/{contact_id}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["count"] == 2
    titles = sorted(e["title"] for e in body["data"])
    assert titles == ["Born", "Graduated"]


def test_list_life_events_unknown_contact_404(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.get(
        f"{settings.API_V1_STR}/life-events/contact/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 404


def test_update_life_event(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    contact_id = _create_contact(client, superuser_token_headers)
    r = client.post(
        f"{settings.API_V1_STR}/life-events/",
        headers=superuser_token_headers,
        json={
            "contact_id": contact_id,
            "event_type": "job_change",
            "title": "Joined Acme",
            "occurred_at": "2023-01-09",
        },
    )
    event_id = r.json()["id"]

    r = client.patch(
        f"{settings.API_V1_STR}/life-events/{event_id}",
        headers=superuser_token_headers,
        json={
            "title": "Joined Acme Corp",
            "description": "Senior engineer",
            "create_annual_reminder": True,
        },
    )
    assert r.status_code == 200
    content = r.json()
    assert content["title"] == "Joined Acme Corp"
    assert content["description"] == "Senior engineer"
    assert content["create_annual_reminder"] is True
    assert content["event_type"] == "job_change"  # untouched


def test_update_life_event_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.patch(
        f"{settings.API_V1_STR}/life-events/{uuid.uuid4()}",
        headers=superuser_token_headers,
        json={"title": "Phantom"},
    )
    assert r.status_code == 404


def test_delete_life_event(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    contact_id = _create_contact(client, superuser_token_headers)
    r = client.post(
        f"{settings.API_V1_STR}/life-events/",
        headers=superuser_token_headers,
        json={
            "contact_id": contact_id,
            "event_type": "move",
            "title": "Moved to Boston",
            "occurred_at": str(date.today()),
        },
    )
    event_id = r.json()["id"]

    r = client.delete(
        f"{settings.API_V1_STR}/life-events/{event_id}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    assert r.json()["ok"] is True

    r = client.get(
        f"{settings.API_V1_STR}/life-events/contact/{contact_id}",
        headers=superuser_token_headers,
    )
    assert event_id not in [e["id"] for e in r.json()["data"]]


def test_delete_life_event_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.delete(
        f"{settings.API_V1_STR}/life-events/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 404


def test_life_event_isolation_between_users(
    client: TestClient, db: Session
) -> None:
    from tests.utils.user import (
        authentication_token_from_email,
        create_random_user,
    )

    alice = create_random_user(db)
    bob = create_random_user(db)
    alice_h = authentication_token_from_email(client=client, email=alice.email, db=db)
    bob_h = authentication_token_from_email(client=client, email=bob.email, db=db)

    contact_id = _create_contact(client, alice_h, "Private")
    r = client.post(
        f"{settings.API_V1_STR}/life-events/",
        headers=alice_h,
        json={
            "contact_id": contact_id,
            "event_type": "birthday",
            "title": "Secret birthday",
            "occurred_at": "1985-07-04",
        },
    )
    event_id = r.json()["id"]

    r = client.get(
        f"{settings.API_V1_STR}/life-events/contact/{contact_id}",
        headers=bob_h,
    )
    assert r.status_code == 404

    r = client.post(
        f"{settings.API_V1_STR}/life-events/",
        headers=bob_h,
        json={
            "contact_id": contact_id,
            "event_type": "birthday",
            "title": "Hijack",
            "occurred_at": "1985-07-04",
        },
    )
    assert r.status_code == 404

    r = client.patch(
        f"{settings.API_V1_STR}/life-events/{event_id}",
        headers=bob_h,
        json={"title": "Hijacked"},
    )
    assert r.status_code == 404

    r = client.delete(
        f"{settings.API_V1_STR}/life-events/{event_id}",
        headers=bob_h,
    )
    assert r.status_code == 404


def test_life_event_visible_via_tag_share(client: TestClient, db: Session) -> None:
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
        json={"name": f"shared-le-{uuid.uuid4().hex[:6]}"},
    ).json()
    contact = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=alice_h,
        json={"first_name": "Shared", "tag_ids": [tag["id"]]},
    ).json()
    client.post(
        f"{settings.API_V1_STR}/life-events/",
        headers=alice_h,
        json={
            "contact_id": contact["id"],
            "event_type": "birthday",
            "title": "Birthday",
            "occurred_at": "1990-04-12",
        },
    )
    r = client.post(
        f"{settings.API_V1_STR}/tag-shares/",
        headers=alice_h,
        json={"tag_id": tag["id"], "grantee_id": str(bob.id)},
    )
    assert r.status_code == 200

    r = client.get(
        f"{settings.API_V1_STR}/life-events/contact/{contact['id']}",
        headers=bob_h,
    )
    assert r.status_code == 200
    titles = [e["title"] for e in r.json()["data"]]
    assert "Birthday" in titles
