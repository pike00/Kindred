"""Regression tests for owner-safe tags on shared contacts."""

import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.core.config import settings
from app.models import ContactTag, TagShare
from tests.utils.user import authentication_token_from_email, create_random_user

API = settings.API_V1_STR


def _tag(client: TestClient, headers: dict[str, str], name: str) -> dict:
    response = client.post(f"{API}/tags/", headers=headers, json={"name": name})
    assert response.status_code == 200, response.text
    return response.json()


def _contact(
    client: TestClient,
    headers: dict[str, str],
    first_name: str,
) -> dict:
    response = client.post(
        f"{API}/contacts/",
        headers=headers,
        json={"first_name": first_name},
    )
    assert response.status_code == 200, response.text
    return response.json()


def test_shared_contact_tags_cannot_be_mutated_or_disclosed(
    client: TestClient,
    db: Session,
) -> None:
    alice = create_random_user(db)
    bob = create_random_user(db)
    charlie = create_random_user(db)
    alice_headers = authentication_token_from_email(
        client=client, email=alice.email, db=db
    )
    bob_headers = authentication_token_from_email(client=client, email=bob.email, db=db)
    charlie_headers = authentication_token_from_email(
        client=client, email=charlie.email, db=db
    )

    shared_tag = _tag(client, alice_headers, "alice-shared")
    private_tag = _tag(client, alice_headers, "alice-private")
    bob_tag = _tag(client, bob_headers, "bob-owned")
    contact = _contact(client, alice_headers, "Alice Shared")

    response = client.patch(
        f"{API}/contacts/{contact['id']}",
        headers=alice_headers,
        json={"tag_ids": [shared_tag["id"], private_tag["id"]]},
    )
    assert response.status_code == 200, response.text

    share = client.post(
        f"{API}/tag-shares/",
        headers=alice_headers,
        json={"tag_id": shared_tag["id"], "grantee_id": str(bob.id)},
    )
    assert share.status_code == 200, share.text

    visible = client.get(f"{API}/contacts/{contact['id']}", headers=bob_headers)
    assert visible.status_code == 200, visible.text
    visible_tag_names = {tag["name"] for tag in visible.json()["tags"]}
    assert visible_tag_names == {"alice-shared"}

    forbidden_update = client.patch(
        f"{API}/contacts/{contact['id']}",
        headers=bob_headers,
        json={"tag_ids": [bob_tag["id"]]},
    )
    assert forbidden_update.status_code == 403

    forbidden_bulk = client.patch(
        f"{API}/contacts/bulk",
        headers=bob_headers,
        json={
            "contact_ids": [contact["id"]],
            "operations": {"add_tag_ids": [bob_tag["id"]]},
        },
    )
    assert forbidden_bulk.status_code == 403

    forbidden_create = client.post(
        f"{API}/contacts/",
        headers=bob_headers,
        json={"first_name": "Bob Contact", "tag_ids": [shared_tag["id"]]},
    )
    assert forbidden_create.status_code == 422

    bob_links = db.exec(
        select(ContactTag).where(ContactTag.tag_id == uuid.UUID(bob_tag["id"]))
    ).all()
    assert bob_links == []

    # Even a legacy poisoned link cannot make Alice's contact visible through
    # Bob's separately shared tag.
    poisoned = ContactTag(
        contact_id=uuid.UUID(contact["id"]),
        tag_id=uuid.UUID(bob_tag["id"]),
    )
    db.add(poisoned)
    db.add(TagShare(tag_id=uuid.UUID(bob_tag["id"]), grantee_id=charlie.id))
    db.commit()

    poisoned_visibility = client.get(
        f"{API}/contacts/{contact['id']}", headers=charlie_headers
    )
    assert poisoned_visibility.status_code == 404
