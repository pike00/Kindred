"""Tests for contact management routes."""

import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.models import AllContactsShare
from tests.utils.user import authentication_token_from_email, create_random_user


def _grant_all_contacts_share(db: Session, *, owner_id: str, grantee_id: str) -> None:
    db.add(AllContactsShare(owner_id=owner_id, grantee_id=grantee_id))
    db.commit()


def _revoke_all_contacts_share(db: Session, *, owner_id: str, grantee_id: str) -> None:
    share = db.get(AllContactsShare, (owner_id, grantee_id))
    assert share is not None
    db.delete(share)
    db.commit()


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
    assert isinstance(content["tags"], list)
    # Regression: Group was merged into Tag on 2026-05-06; the response
    # must not carry a `groups` field — frontends call .map on it.
    assert "groups" not in content


def test_contact_email_auto_logging_can_be_enabled(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    create_response = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=superuser_token_headers,
        json={"first_name": "Brisa", "auto_log_email": True},
    )
    assert create_response.status_code == 200
    contact_id = create_response.json()["id"]
    assert create_response.json()["auto_log_email"] is True

    update_response = client.patch(
        f"{settings.API_V1_STR}/contacts/{contact_id}",
        headers=superuser_token_headers,
        json={"auto_log_email": False},
    )
    assert update_response.status_code == 200
    assert update_response.json()["auto_log_email"] is False


def test_create_contact_with_optional_fields(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    data = {
        "first_name": "Bob",
        "last_name": "Jones",
        "company": "Acme Corp",
        "title": "Engineer",
        "nickname": "Bobby",
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


def test_create_contact_allows_missing_or_blank_first_name(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=superuser_token_headers,
        json={"last_name": "KnownFamilyName"},
    )
    assert r.status_code == 200
    assert r.json()["first_name"] == ""
    assert r.json()["last_name"] == "KnownFamilyName"

    r = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=superuser_token_headers,
        json={"first_name": "", "last_name": ""},
    )
    assert r.status_code == 200
    assert r.json()["first_name"] == ""
    assert r.json()["last_name"] == ""


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
    # Verify contacts have tags field
    for contact in content["data"]:
        assert "tags" in contact
        # Regression: no legacy `groups` field after the 2026-05-06 merge.
        assert "groups" not in contact


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
    alice = create_random_user(db)
    bob = create_random_user(db)
    alice_h = authentication_token_from_email(client=client, email=alice.email, db=db)
    bob_h = authentication_token_from_email(client=client, email=bob.email, db=db)

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

    r = client.get(f"{settings.API_V1_STR}/contacts/{alice_cid}", headers=bob_h)
    assert r.status_code == 404


def test_shared_tag_exposes_contact(client: TestClient, db: Session) -> None:
    alice = create_random_user(db)
    bob = create_random_user(db)
    alice_h = authentication_token_from_email(client=client, email=alice.email, db=db)
    bob_h = authentication_token_from_email(client=client, email=bob.email, db=db)

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

    r = client.get(f"{settings.API_V1_STR}/contacts/{contact['id']}", headers=bob_h)
    assert r.status_code == 200


def test_all_contacts_share_exposes_existing_contact_without_tags(
    client: TestClient, db: Session
) -> None:
    alice = create_random_user(db)
    bob = create_random_user(db)
    alice_h = authentication_token_from_email(client=client, email=alice.email, db=db)
    bob_h = authentication_token_from_email(client=client, email=bob.email, db=db)

    contact = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=alice_h,
        json={"first_name": "ExistingShared"},
    ).json()
    _grant_all_contacts_share(db, owner_id=alice.id, grantee_id=bob.id)

    r = client.get(f"{settings.API_V1_STR}/contacts/", headers=bob_h)
    assert r.status_code == 200
    assert contact["id"] in [item["id"] for item in r.json()["data"]]

    r = client.get(f"{settings.API_V1_STR}/contacts/{contact['id']}", headers=bob_h)
    assert r.status_code == 200
    assert r.json()["first_name"] == "ExistingShared"


def test_all_contacts_share_exposes_future_contact_and_child_resource(
    client: TestClient, db: Session
) -> None:
    alice = create_random_user(db)
    bob = create_random_user(db)
    alice_h = authentication_token_from_email(client=client, email=alice.email, db=db)
    bob_h = authentication_token_from_email(client=client, email=bob.email, db=db)

    _grant_all_contacts_share(db, owner_id=alice.id, grantee_id=bob.id)

    contact = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=alice_h,
        json={"first_name": "FutureShared"},
    ).json()
    address = client.post(
        f"{settings.API_V1_STR}/addresses/",
        headers=alice_h,
        json={"contact_id": contact["id"], "label": "home", "city": "SharedTown"},
    ).json()

    r = client.get(f"{settings.API_V1_STR}/contacts/", headers=bob_h)
    assert r.status_code == 200
    assert contact["id"] in [item["id"] for item in r.json()["data"]]

    r = client.get(f"{settings.API_V1_STR}/contacts/{contact['id']}", headers=bob_h)
    assert r.status_code == 200
    assert r.json()["first_name"] == "FutureShared"

    r = client.get(
        f"{settings.API_V1_STR}/addresses/contact/{contact['id']}",
        headers=bob_h,
    )
    assert r.status_code == 200
    assert [item["id"] for item in r.json()["data"]] == [address["id"]]

    r = client.post(
        f"{settings.API_V1_STR}/addresses/",
        headers=bob_h,
        json={"contact_id": contact["id"], "label": "work", "city": "BobTown"},
    )
    assert r.status_code == 200
    assert r.json()["city"] == "BobTown"


def test_revoking_all_contacts_share_removes_contact_access(
    client: TestClient, db: Session
) -> None:
    alice = create_random_user(db)
    bob = create_random_user(db)
    alice_h = authentication_token_from_email(client=client, email=alice.email, db=db)
    bob_h = authentication_token_from_email(client=client, email=bob.email, db=db)

    contact = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=alice_h,
        json={"first_name": "RevokedShared"},
    ).json()
    _grant_all_contacts_share(db, owner_id=alice.id, grantee_id=bob.id)

    r = client.get(f"{settings.API_V1_STR}/contacts/{contact['id']}", headers=bob_h)
    assert r.status_code == 200

    _revoke_all_contacts_share(db, owner_id=alice.id, grantee_id=bob.id)

    r = client.get(f"{settings.API_V1_STR}/contacts/", headers=bob_h)
    assert r.status_code == 200
    assert contact["id"] not in [item["id"] for item in r.json()["data"]]

    r = client.get(f"{settings.API_V1_STR}/contacts/{contact['id']}", headers=bob_h)
    assert r.status_code == 404


def test_delete_contact_is_soft_delete(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """DELETE sets deleted_at; row is hidden but recoverable."""
    r = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=superuser_token_headers,
        json={"first_name": "SoftDelete"},
    )
    contact_id = r.json()["id"]

    r = client.delete(
        f"{settings.API_V1_STR}/contacts/{contact_id}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200

    # Hidden from default list
    r = client.get(
        f"{settings.API_V1_STR}/contacts/",
        headers=superuser_token_headers,
    )
    assert contact_id not in [c["id"] for c in r.json()["data"]]

    # Visible with only_deleted=true
    r = client.get(
        f"{settings.API_V1_STR}/contacts/",
        headers=superuser_token_headers,
        params={"only_deleted": True},
    )
    assert r.status_code == 200
    payload = next((c for c in r.json()["data"] if c["id"] == contact_id), None)
    assert payload is not None
    assert payload["deleted_at"] is not None

    # Also visible with include_deleted=true alongside live rows
    r = client.get(
        f"{settings.API_V1_STR}/contacts/",
        headers=superuser_token_headers,
        params={"include_deleted": True},
    )
    assert r.status_code == 200
    assert contact_id in [c["id"] for c in r.json()["data"]]


def test_restore_contact(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=superuser_token_headers,
        json={"first_name": "Restorable"},
    )
    contact_id = r.json()["id"]

    client.delete(
        f"{settings.API_V1_STR}/contacts/{contact_id}",
        headers=superuser_token_headers,
    )

    # Restore
    r = client.post(
        f"{settings.API_V1_STR}/contacts/{contact_id}/restore",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == contact_id
    assert body["deleted_at"] is None

    # Now visible again on default list
    r = client.get(
        f"{settings.API_V1_STR}/contacts/",
        headers=superuser_token_headers,
    )
    assert contact_id in [c["id"] for c in r.json()["data"]]


def test_restore_contact_not_deleted_400(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=superuser_token_headers,
        json={"first_name": "Live"},
    )
    contact_id = r.json()["id"]

    r = client.post(
        f"{settings.API_V1_STR}/contacts/{contact_id}/restore",
        headers=superuser_token_headers,
    )
    assert r.status_code == 400


def test_update_soft_deleted_contact_404(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=superuser_token_headers,
        json={"first_name": "DeletedUpdate"},
    )
    contact_id = r.json()["id"]
    client.delete(
        f"{settings.API_V1_STR}/contacts/{contact_id}",
        headers=superuser_token_headers,
    )

    r = client.patch(
        f"{settings.API_V1_STR}/contacts/{contact_id}",
        headers=superuser_token_headers,
        json={"first_name": "Updated"},
    )
    assert r.status_code == 404


def test_delete_already_soft_deleted_404(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=superuser_token_headers,
        json={"first_name": "DoubleDelete"},
    )
    contact_id = r.json()["id"]
    r = client.delete(
        f"{settings.API_V1_STR}/contacts/{contact_id}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200

    r = client.delete(
        f"{settings.API_V1_STR}/contacts/{contact_id}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 404


def test_addresses_on_soft_deleted_contact_hidden(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Soft-deleted contact's child resources (e.g. addresses) become inaccessible."""
    r = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=superuser_token_headers,
        json={"first_name": "WithAddress"},
    )
    contact_id = r.json()["id"]
    r = client.post(
        f"{settings.API_V1_STR}/addresses/",
        headers=superuser_token_headers,
        json={"contact_id": contact_id, "city": "Seattle"},
    )
    assert r.status_code == 200

    client.delete(
        f"{settings.API_V1_STR}/contacts/{contact_id}",
        headers=superuser_token_headers,
    )

    # Listing addresses for a soft-deleted contact should 404 (contact_visible
    # flips to false because visible_contact_ids hides deleted rows by default).
    r = client.get(
        f"{settings.API_V1_STR}/addresses/contact/{contact_id}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 404


def test_create_contact_with_timezone_and_pronouns(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test creating a contact with timezone and pronouns fields."""
    data = {
        "first_name": "ZoneTest",
        "timezone": "America/New_York",
        "pronouns": "they/them",
    }
    r = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=superuser_token_headers,
        json=data,
    )
    assert r.status_code == 200
    content = r.json()
    assert content["timezone"] == "America/New_York"
    assert content["pronouns"] == "they/them"


def test_update_contact_timezone_and_pronouns(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test updating a contact's timezone and pronouns."""
    # Create contact
    r = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=superuser_token_headers,
        json={"first_name": "UpdateZone"},
    )
    assert r.status_code == 200
    contact_id = r.json()["id"]

    # Update with timezone and pronouns
    r = client.patch(
        f"{settings.API_V1_STR}/contacts/{contact_id}",
        headers=superuser_token_headers,
        json={"timezone": "Europe/London", "pronouns": "she/her"},
    )
    assert r.status_code == 200
    content = r.json()
    assert content["timezone"] == "Europe/London"
    assert content["pronouns"] == "she/her"


def test_timezone_conversion(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test that timezone conversion works for reminder calculations."""

    # Create contact with timezone
    r = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=superuser_token_headers,
        json={
            "first_name": "TZTest",
            "timezone": "America/Los_Angeles",
            "contact_frequency_days": 30,
        },
    )
    assert r.status_code == 200
    contact_id = r.json()["id"]

    # Verify the contact was created with the correct timezone
    r = client.get(
        f"{settings.API_V1_STR}/contacts/{contact_id}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    assert r.json()["timezone"] == "America/Los_Angeles"


def test_pronouns_in_contact_list(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test that pronouns are returned in contact list."""
    # Create contact with pronouns
    r = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=superuser_token_headers,
        json={"first_name": "PronounTest", "pronouns": "he/him"},
    )
    assert r.status_code == 200

    # List contacts and check pronouns field
    r = client.get(
        f"{settings.API_V1_STR}/contacts/",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    contacts = r.json()["data"]
    pronoun_contact = next(c for c in contacts if c["first_name"] == "PronounTest")
    assert pronoun_contact["pronouns"] == "he/him"


def test_skip_contact(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test skipping a contact creates a SKIP interaction and updates last_contacted_at."""
    create_res = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=superuser_token_headers,
        json={"first_name": "SkipMe"},
    )
    assert create_res.status_code == 200
    contact_id = create_res.json()["id"]

    skip_res = client.patch(
        f"{settings.API_V1_STR}/contacts/{contact_id}/skip",
        headers=superuser_token_headers,
    )
    assert skip_res.status_code == 200
    assert skip_res.json()["last_contacted_at"] is not None

    # Verify a skip interaction was recorded
    interactions_res = client.get(
        f"{settings.API_V1_STR}/interactions/",
        headers=superuser_token_headers,
    )
    assert interactions_res.status_code == 200
    skip_interaction = next(
        (
            item
            for item in interactions_res.json()["data"]
            if item.get("channel") == "skip"
        ),
        None,
    )
    assert skip_interaction is not None
    assert skip_interaction["notes"] == "Skipped check-in"


def test_skip_contact_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test skipping a non-existent contact returns 404."""
    random_id = str(uuid.uuid4())
    r = client.patch(
        f"{settings.API_V1_STR}/contacts/{random_id}/skip",
        headers=superuser_token_headers,
    )
    assert r.status_code == 404

