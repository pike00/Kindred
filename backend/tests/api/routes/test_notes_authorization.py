"""Regression tests for note ownership, mentions, restore, and retry safety."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.core.config import settings
from app.models import AllContactsShare, Contact, Note, NoteMention, User
from tests.utils.user import authentication_token_from_email, create_random_user

API = settings.API_V1_STR


def test_note_client_id_metadata_is_owner_scoped() -> None:
    indexes = {index.name: index for index in Note.__table__.indexes}
    owner_client_index = indexes["uq_note_owner_client_id"]
    assert owner_client_index.unique is True
    assert [column.name for column in owner_client_index.columns] == [
        "owner_id",
        "client_id",
    ]
    assert all(
        not (column.name == "client_id" and column.unique)
        for column in Note.__table__.columns
    )


def _contact(db: Session, owner: User, first_name: str) -> Contact:
    contact = Contact(first_name=first_name, owner_id=owner.id)
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


def _headers(client: TestClient, db: Session, user: User) -> dict[str, str]:
    return authentication_token_from_email(
        client=client,
        email=user.email,
        db=db,
    )


def test_restore_note_requires_authentication(
    client: TestClient,
    db: Session,
) -> None:
    owner = create_random_user(db)
    contact = _contact(db, owner, "Owner")
    note = Note(
        body="deleted private note",
        contact_id=contact.id,
        owner_id=owner.id,
        deleted_at=datetime.now(timezone.utc),
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    response = client.post(f"{API}/notes/{note.id}/restore")

    assert response.status_code == 401
    db.refresh(note)
    assert note.deleted_at is not None


def test_restore_note_rejects_other_owner(
    client: TestClient,
    db: Session,
    user_headers: dict[str, str],
) -> None:
    other = create_random_user(db)
    contact = _contact(db, other, "Other")
    note = Note(
        body="other user's private note",
        contact_id=contact.id,
        owner_id=other.id,
        deleted_at=datetime.now(timezone.utc),
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    response = client.post(
        f"{API}/notes/{note.id}/restore",
        headers=user_headers,
    )

    assert response.status_code == 404
    db.refresh(note)
    assert note.deleted_at is not None


def test_contact_notes_hide_other_owners_notes_on_the_contact(
    client: TestClient,
    db: Session,
) -> None:
    contact_owner = create_random_user(db)
    other_owner = create_random_user(db)
    contact = _contact(db, contact_owner, "Owned contact")
    db.add(
        Note(
            body="legacy note from another account",
            contact_id=contact.id,
            owner_id=other_owner.id,
        )
    )
    db.commit()

    response = client.get(
        f"{API}/notes/contact/{contact.id}",
        headers=_headers(client, db, contact_owner),
    )

    assert response.status_code == 200
    assert response.json()["data"] == []


def test_contact_mentions_do_not_expose_other_users_notes(
    client: TestClient,
    db: Session,
) -> None:
    alice = create_random_user(db)
    mallory = create_random_user(db)
    bob = _contact(db, alice, "Bob")
    carol = _contact(db, alice, "Carol")
    db.add(AllContactsShare(owner_id=alice.id, grantee_id=mallory.id))
    db.commit()

    alice_headers = _headers(client, db, alice)
    created = client.post(
        f"{API}/notes/",
        headers=alice_headers,
        json={
            "contact_id": str(carol.id),
            "body": f"Private note about Carol mentioning @[Bob]({bob.id}).",
        },
    )
    assert created.status_code == 200

    mallory_headers = _headers(client, db, mallory)
    response = client.get(
        f"{API}/contacts/{bob.id}/mentions",
        headers=mallory_headers,
    )

    assert response.status_code == 200
    assert response.json() == []


def test_contact_mentions_hide_notes_whose_source_contact_is_not_visible(
    client: TestClient,
    db: Session,
) -> None:
    note_owner = create_random_user(db)
    other_owner = create_random_user(db)
    mentioned = _contact(db, note_owner, "Mentioned")
    foreign_source = _contact(db, other_owner, "Foreign source")
    note = Note(
        body="stale cross-owner note",
        contact_id=foreign_source.id,
        owner_id=note_owner.id,
    )
    db.add(note)
    db.flush()
    db.add(NoteMention(note_id=note.id, contact_id=mentioned.id))
    db.commit()

    response = client.get(
        f"{API}/contacts/{mentioned.id}/mentions",
        headers=_headers(client, db, note_owner),
    )

    assert response.status_code == 200
    assert response.json() == []


def test_foreign_contact_mention_is_not_persisted(
    client: TestClient,
    db: Session,
) -> None:
    victim = create_random_user(db)
    attacker = create_random_user(db)
    victim_contact = _contact(db, victim, "Victim")
    attacker_contact = _contact(db, attacker, "Attacker")
    attacker_headers = _headers(client, db, attacker)

    response = client.post(
        f"{API}/notes/",
        headers=attacker_headers,
        json={
            "contact_id": str(attacker_contact.id),
            "body": f"Injected mention @[Victim]({victim_contact.id}).",
        },
    )
    assert response.status_code == 200

    note_id = uuid.UUID(response.json()["id"])
    mentions = db.exec(select(NoteMention).where(NoteMention.note_id == note_id)).all()
    assert mentions == []

    victim_headers = _headers(client, db, victim)
    victim_response = client.get(
        f"{API}/contacts/{victim_contact.id}/mentions",
        headers=victim_headers,
    )
    assert victim_response.status_code == 200
    assert victim_response.json() == []


def test_note_client_id_is_scoped_to_owner(
    client: TestClient,
    db: Session,
) -> None:
    first_user = create_random_user(db)
    second_user = create_random_user(db)
    first_contact = _contact(db, first_user, "First")
    second_contact = _contact(db, second_user, "Second")
    first_headers = _headers(client, db, first_user)
    second_headers = _headers(client, db, second_user)
    client_id = uuid.uuid4().hex

    first = client.post(
        f"{API}/notes/",
        headers=first_headers,
        json={
            "contact_id": str(first_contact.id),
            "body": "first user's note",
            "client_id": client_id,
        },
    )
    assert first.status_code == 200

    second = client.post(
        f"{API}/notes/",
        headers=second_headers,
        json={
            "contact_id": str(second_contact.id),
            "body": "second user's note",
            "client_id": client_id,
        },
    )

    assert second.status_code == 200
    assert second.json()["id"] != first.json()["id"]
    assert second.json()["body"] == "second user's note"
    assert second.json()["contact_id"] == str(second_contact.id)


def test_same_owner_client_id_retry_returns_existing_note(
    client: TestClient,
    db: Session,
    user: User,
    user_headers: dict[str, str],
) -> None:
    contact = _contact(db, user, "Retry")
    client_id = uuid.uuid4().hex
    payload = {
        "contact_id": str(contact.id),
        "body": "only once",
        "client_id": client_id,
    }

    first = client.post(f"{API}/notes/", headers=user_headers, json=payload)
    second = client.post(f"{API}/notes/", headers=user_headers, json=payload)

    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json()["id"] == first.json()["id"]
    notes = db.exec(select(Note).where(Note.client_id == client_id)).all()
    assert len(notes) == 1


def test_note_client_id_has_owner_scoped_database_constraint(
    db: Session,
    user: User,
) -> None:
    first_contact = _contact(db, user, "Unique One")
    second_contact = _contact(db, user, "Unique Two")
    client_id = uuid.uuid4().hex
    db.add(
        Note(
            body="first",
            contact_id=first_contact.id,
            owner_id=user.id,
            client_id=client_id,
        )
    )
    db.commit()
    db.add(
        Note(
            body="second",
            contact_id=second_contact.id,
            owner_id=user.id,
            client_id=client_id,
        )
    )

    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()
