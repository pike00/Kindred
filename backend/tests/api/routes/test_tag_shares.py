import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.core.config import settings
from app.models import Contact, ContactTag, Note, Tag, TagShare
from tests.utils.user import authentication_token_from_email, create_random_user


def _make_tag(client, headers, name="t"):
    r = client.post(
        f"{settings.API_V1_STR}/tags/", headers=headers, json={"name": name}
    )
    assert r.status_code == 200, r.text
    return r.json()


def test_share_and_unshare(client: TestClient, db: Session):
    alice = create_random_user(db)
    bob = create_random_user(db)
    alice_h = authentication_token_from_email(client=client, email=alice.email, db=db)
    tag = _make_tag(client, alice_h, "shared-tag")

    r = client.post(
        f"{settings.API_V1_STR}/tag-shares/",
        headers=alice_h,
        json={"tag_id": tag["id"], "grantee_id": str(bob.id)},
    )
    assert r.status_code == 200, r.text

    r = client.get(
        f"{settings.API_V1_STR}/tag-shares/?tag_id={tag['id']}",
        headers=alice_h,
    )
    assert r.status_code == 200
    assert r.json()["count"] == 1

    r = client.delete(
        f"{settings.API_V1_STR}/tag-shares/{tag['id']}/{bob.id}",
        headers=alice_h,
    )
    assert r.status_code == 200
    r = client.get(
        f"{settings.API_V1_STR}/tag-shares/?tag_id={tag['id']}",
        headers=alice_h,
    )
    assert r.json()["count"] == 0


def test_cannot_share_unowned_tag(client: TestClient, db: Session):
    alice = create_random_user(db)
    bob = create_random_user(db)
    alice_h = authentication_token_from_email(client=client, email=alice.email, db=db)
    bob_h = authentication_token_from_email(client=client, email=bob.email, db=db)
    tag = _make_tag(client, alice_h, "alices")
    r = client.post(
        f"{settings.API_V1_STR}/tag-shares/",
        headers=bob_h,
        json={"tag_id": tag["id"], "grantee_id": str(alice.id)},
    )
    assert r.status_code == 404


def test_tag_share_create_handles_insert_race(
    client: TestClient,
    db: Session,
    monkeypatch,
) -> None:
    alice = create_random_user(db)
    bob = create_random_user(db)
    alice_h = authentication_token_from_email(client=client, email=alice.email, db=db)
    tag = _make_tag(client, alice_h, "race-tag")

    first = client.post(
        f"{settings.API_V1_STR}/tag-shares/",
        headers=alice_h,
        json={"tag_id": tag["id"], "grantee_id": str(bob.id)},
    )
    assert first.status_code == 200

    original_get = Session.get
    missed = False

    def get_with_one_race_miss(self, model, ident, *args, **kwargs):
        nonlocal missed
        if model is TagShare and not missed:
            missed = True
            return None
        return original_get(self, model, ident, *args, **kwargs)

    monkeypatch.setattr(Session, "get", get_with_one_race_miss)

    raced = client.post(
        f"{settings.API_V1_STR}/tag-shares/",
        headers=alice_h,
        json={"tag_id": tag["id"], "grantee_id": str(bob.id)},
    )

    assert raced.status_code == 200
    assert (
        len(
            db.exec(
                select(TagShare).where(TagShare.tag_id == uuid.UUID(tag["id"]))
            ).all()
        )
        == 1
    )


def test_share_preview_counts_only_owned_active_notes(
    client: TestClient,
    db: Session,
) -> None:
    alice = create_random_user(db)
    bob = create_random_user(db)
    alice_h = authentication_token_from_email(client=client, email=alice.email, db=db)
    tag = _make_tag(client, alice_h, "note-count-tag")
    tag_row = db.get(Tag, tag["id"])
    contact = Contact(first_name="Preview", owner_id=alice.id)
    db.add(contact)
    db.flush()
    db.add(ContactTag(contact_id=contact.id, tag_id=tag_row.id))
    db.add(
        Note(
            body="owned active note",
            contact_id=contact.id,
            owner_id=alice.id,
        )
    )
    db.add(
        Note(
            body="owned deleted note",
            contact_id=contact.id,
            owner_id=alice.id,
            deleted_at=contact.created_at,
        )
    )
    db.add(
        Note(
            body="foreign note",
            contact_id=contact.id,
            owner_id=bob.id,
        )
    )
    db.commit()

    response = client.get(
        f"{settings.API_V1_STR}/tag-shares/preview/{tag['id']}",
        headers=alice_h,
    )

    assert response.status_code == 200
    entities = {
        entity["entity_type"]: entity["count"] for entity in response.json()["entities"]
    }
    assert entities["Note"] == 1
