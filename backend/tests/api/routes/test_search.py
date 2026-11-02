"""Tests for global full-text search results."""

from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.core.config import settings
from app.models import (
    AllContactsShare,
    Contact,
    ContactTag,
    Interaction,
    Note,
    Tag,
    TagShare,
)
from tests.utils.user import authentication_token_from_email, create_random_user


def test_note_search_result_exposes_contact_id(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    contact_response = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=superuser_token_headers,
        json={"first_name": "Search Contact"},
    )
    assert contact_response.status_code == 200
    contact_id = contact_response.json()["id"]

    note_response = client.post(
        f"{settings.API_V1_STR}/notes/",
        headers=superuser_token_headers,
        json={
            "contact_id": contact_id,
            "body": "Unique zephyrquartz marker for note navigation.",
        },
    )
    assert note_response.status_code == 200

    response = client.get(
        f"{settings.API_V1_STR}/search",
        headers=superuser_token_headers,
        params={"q": "zephyrquartz"},
    )
    assert response.status_code == 200
    note_results = [
        result for result in response.json()["results"] if result["type"] == "note"
    ]
    assert len(note_results) == 1
    assert note_results[0]["contact_id"] == contact_id


def test_search_uses_canonical_contact_visibility_and_hides_trash(
    client: TestClient,
    db: Session,
) -> None:
    alice = create_random_user(db)
    bob = create_random_user(db)
    charlie = create_random_user(db)
    alice_headers = authentication_token_from_email(
        client=client, email=alice.email, db=db
    )
    charlie_headers = authentication_token_from_email(
        client=client, email=charlie.email, db=db
    )

    contact_response = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=alice_headers,
        json={"first_name": "CanonicalSearchMarker"},
    )
    assert contact_response.status_code == 200, contact_response.text
    contact_id = contact_response.json()["id"]
    note_response = client.post(
        f"{settings.API_V1_STR}/notes/",
        headers=alice_headers,
        json={
            "contact_id": contact_id,
            "body": "CanonicalSearchMarker private note",
        },
    )
    assert note_response.status_code == 200, note_response.text
    interaction_response = client.post(
        f"{settings.API_V1_STR}/interactions/",
        headers=alice_headers,
        json={
            "attendee_ids": [contact_id],
            "channel": "call",
            "notes": "CanonicalSearchMarker interaction",
            "occurred_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    assert interaction_response.status_code == 200, interaction_response.text

    alice_tag = Tag(name="alice-search", owner_id=alice.id)
    poisoned_tag = Tag(name="bob-poison", owner_id=bob.id)
    db.add(alice_tag)
    db.add(poisoned_tag)
    db.commit()
    db.refresh(alice_tag)
    db.refresh(poisoned_tag)
    db.add(ContactTag(contact_id=contact_id, tag_id=alice_tag.id))
    db.add(TagShare(tag_id=alice_tag.id, grantee_id=bob.id))
    db.add(ContactTag(contact_id=contact_id, tag_id=poisoned_tag.id))
    db.add(TagShare(tag_id=poisoned_tag.id, grantee_id=charlie.id))
    db.commit()

    poisoned = client.get(
        f"{settings.API_V1_STR}/search",
        headers=charlie_headers,
        params={"q": "CanonicalSearchMarker"},
    )
    assert poisoned.status_code == 200
    assert poisoned.json()["results"] == []

    db.add(AllContactsShare(owner_id=alice.id, grantee_id=charlie.id))
    db.commit()
    shared = client.get(
        f"{settings.API_V1_STR}/search",
        headers=charlie_headers,
        params={"q": "CanonicalSearchMarker"},
    )
    assert shared.status_code == 200
    assert {result["type"] for result in shared.json()["results"]} == {
        "contact",
        "note",
        "interaction",
    }

    note = db.exec(
        select(Note).where(Note.contact_id == contact_id)
    ).first()
    assert note is not None
    note.deleted_at = datetime.now(timezone.utc)
    interaction = db.exec(
        select(Interaction).where(
            Interaction.notes == "CanonicalSearchMarker interaction"
        )
    ).first()
    assert interaction is not None
    interaction.deleted_at = datetime.now(timezone.utc)
    contact = db.get(Contact, contact_id)
    assert contact is not None
    contact.deleted_at = datetime.now(timezone.utc)
    db.add(note)
    db.add(interaction)
    db.add(contact)
    db.commit()

    trashed = client.get(
        f"{settings.API_V1_STR}/search",
        headers=charlie_headers,
        params={"q": "CanonicalSearchMarker"},
    )
    assert trashed.status_code == 200
    assert trashed.json()["results"] == []
