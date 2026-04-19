"""Tests for contact management routes."""

import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.models import Contact, Tag, ContactTag


def test_create_contact(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    data = {"first_name": "Alice", "last_name": "Smith"}
    r = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=superuser_token_headers,
        json=data,
    )
    assert r.status_code == 200
    content = r.json()
    assert content["first_name"] == "Alice"
    assert content["last_name"] == "Smith"
    assert "id" in content
    assert "tags" in content
    assert "groups" in content
    assert isinstance(content["tags"], list)
    assert isinstance(content["groups"], list)


def test_create_contact_with_optional_fields(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    data = {
        "first_name": "Bob",
        "last_name": "Jones",
        "company": "Acme Corp",
        "title": "Engineer",
        "nickname": "Bobby",
        "notes": "Met at conference",
        "how_we_met": "PyCon 2025",
        "is_favorite": True,
    }
    r = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=superuser_token_headers,
        json=data,
    )
    assert r.status_code == 200
    content = r.json()
    assert content["first_name"] == "Bob"
    assert content["company"] == "Acme Corp"
    assert content["title"] == "Engineer"
    assert content["is_favorite"] is True


def test_create_contact_missing_first_name(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    data = {"last_name": "NoFirst"}
    r = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=superuser_token_headers,
        json=data,
    )
    assert r.status_code == 422


def test_list_contacts(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    # Create a contact first
    client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=superuser_token_headers,
        json={"first_name": "ListTest"},
    )
    r = client.get(
        f"{settings.API_V1_STR}/contacts/",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    content = r.json()
    assert "data" in content
    assert "count" in content
    assert content["count"] > 0
    # Verify contacts have tags/groups fields
    for contact in content["data"]:
        assert "tags" in contact
        assert "groups" in contact


def test_list_contacts_excludes_archived(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    # Create an archived contact
    r = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=superuser_token_headers,
        json={"first_name": "ArchivedPerson", "is_archived": True},
    )
    assert r.status_code == 200
    archived_id = r.json()["id"]

    # List without filter should exclude archived
    r = client.get(
        f"{settings.API_V1_STR}/contacts/",
        headers=superuser_token_headers,
    )
    ids = [c["id"] for c in r.json()["data"]]
    assert archived_id not in ids

    # List with is_archived=true should include it
    r = client.get(
        f"{settings.API_V1_STR}/contacts/",
        headers=superuser_token_headers,
        params={"is_archived": True},
    )
    ids = [c["id"] for c in r.json()["data"]]
    assert archived_id in ids


def test_get_contact(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    # Create
    r = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=superuser_token_headers,
        json={"first_name": "GetTest"},
    )
    contact_id = r.json()["id"]

    # Get
    r = client.get(
        f"{settings.API_V1_STR}/contacts/{contact_id}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    content = r.json()
    assert content["id"] == contact_id
    assert content["first_name"] == "GetTest"
    assert "tags" in content
    assert "groups" in content


def test_get_contact_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    fake_id = str(uuid.uuid4())
    r = client.get(
        f"{settings.API_V1_STR}/contacts/{fake_id}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 404


def test_update_contact(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    # Create
    r = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=superuser_token_headers,
        json={"first_name": "UpdateMe"},
    )
    contact_id = r.json()["id"]

    # Update
    r = client.patch(
        f"{settings.API_V1_STR}/contacts/{contact_id}",
        headers=superuser_token_headers,
        json={"first_name": "Updated", "company": "NewCo"},
    )
    assert r.status_code == 200
    content = r.json()
    assert content["first_name"] == "Updated"
    assert content["company"] == "NewCo"
    assert "tags" in content


def test_update_contact_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    fake_id = str(uuid.uuid4())
    r = client.patch(
        f"{settings.API_V1_STR}/contacts/{fake_id}",
        headers=superuser_token_headers,
        json={"first_name": "Ghost"},
    )
    assert r.status_code == 404


def test_delete_contact(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    # Create
    r = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=superuser_token_headers,
        json={"first_name": "DeleteMe"},
    )
    contact_id = r.json()["id"]

    # Delete
    r = client.delete(
        f"{settings.API_V1_STR}/contacts/{contact_id}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    assert r.json()["ok"] is True

    # Verify gone
    r = client.get(
        f"{settings.API_V1_STR}/contacts/{contact_id}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 404


def test_delete_contact_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    fake_id = str(uuid.uuid4())
    r = client.delete(
        f"{settings.API_V1_STR}/contacts/{fake_id}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 404


def test_list_contacts_search(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    # Create a contact with unique name
    client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=superuser_token_headers,
        json={"first_name": "Xerxes", "last_name": "Uniquename"},
    )
    r = client.get(
        f"{settings.API_V1_STR}/contacts/",
        headers=superuser_token_headers,
        params={"search": "Xerxes"},
    )
    assert r.status_code == 200
    assert r.json()["count"] >= 1
    names = [c["first_name"] for c in r.json()["data"]]
    assert "Xerxes" in names


def test_list_contacts_favorite_filter(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=superuser_token_headers,
        json={"first_name": "FavPerson", "is_favorite": True},
    )
    r = client.get(
        f"{settings.API_V1_STR}/contacts/",
        headers=superuser_token_headers,
        params={"is_favorite": True},
    )
    assert r.status_code == 200
    for contact in r.json()["data"]:
        assert contact["is_favorite"] is True


def test_losing_touch(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    # Create a contact with cadence but no last_contacted_at
    client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=superuser_token_headers,
        json={"first_name": "LosingTouch", "contact_frequency_days": 7},
    )
    r = client.get(
        f"{settings.API_V1_STR}/contacts/losing-touch",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    content = r.json()
    assert "data" in content
    assert "count" in content
    # Should include our contact (never contacted + has cadence)
    names = [c["first_name"] for c in content["data"]]
    assert "LosingTouch" in names


def test_contact_isolation_between_users(client: TestClient, db: Session) -> None:
    from tests.utils.user import (
        authentication_token_from_email,
        create_random_user,
    )

    alice = create_random_user(db)
    bob = create_random_user(db)
    alice_h = authentication_token_from_email(
        client=client, email=alice.email, db=db
    )
    bob_h = authentication_token_from_email(
        client=client, email=bob.email, db=db
    )

    r = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=alice_h,
        json={"first_name": "Private"},
    )
    assert r.status_code == 200
    alice_cid = r.json()["id"]

    r = client.get(f"{settings.API_V1_STR}/contacts/", headers=bob_h)
    assert r.status_code == 200
    ids = [c["id"] for c in r.json()["data"]]
    assert alice_cid not in ids

    r = client.get(
        f"{settings.API_V1_STR}/contacts/{alice_cid}", headers=bob_h
    )
    assert r.status_code == 404


def test_shared_tag_exposes_contact(client: TestClient, db: Session) -> None:
    from tests.utils.user import (
        authentication_token_from_email,
        create_random_user,
    )

    alice = create_random_user(db)
    bob = create_random_user(db)
    alice_h = authentication_token_from_email(
        client=client, email=alice.email, db=db
    )
    bob_h = authentication_token_from_email(
        client=client, email=bob.email, db=db
    )

    tag = client.post(
        f"{settings.API_V1_STR}/tags/",
        headers=alice_h,
        json={"name": "joint"},
    ).json()
    contact = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=alice_h,
        json={"first_name": "Joint", "tag_ids": [tag["id"]]},
    ).json()

    r = client.post(
        f"{settings.API_V1_STR}/tag-shares/",
        headers=alice_h,
        json={"tag_id": tag["id"], "grantee_id": str(bob.id)},
    )
    assert r.status_code == 200

    r = client.get(f"{settings.API_V1_STR}/contacts/", headers=bob_h)
    assert r.status_code == 200
    assert contact["id"] in [c["id"] for c in r.json()["data"]]

    r = client.get(
        f"{settings.API_V1_STR}/contacts/{contact['id']}", headers=bob_h
    )
    assert r.status_code == 200
