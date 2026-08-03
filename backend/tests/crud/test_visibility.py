import uuid
from datetime import datetime, timezone

import pytest
from sqlmodel import Session, select

from app import crud
from app.core.db import engine
from app.core.security import get_password_hash
from app.models import AllContactsShare, Contact, ContactTag, Tag, TagShare, User


@pytest.fixture
def two_users():
    with Session(engine) as s:
        alice = User(
            email=f"alice-{uuid.uuid4()}@t.x", hashed_password=get_password_hash("x")
        )
        bob = User(
            email=f"bob-{uuid.uuid4()}@t.x", hashed_password=get_password_hash("x")
        )
        s.add(alice)
        s.add(bob)
        s.commit()
        s.refresh(alice)
        s.refresh(bob)
        yield alice, bob
        s.delete(alice)
        s.delete(bob)
        s.commit()


def visible_ids(session: Session, user: User, *, include_deleted: bool = False) -> set[uuid.UUID]:
    return set(
        session.exec(
            select(Contact.id).where(
                Contact.id.in_(
                    crud.visible_contact_ids(user, include_deleted=include_deleted)
                )
            )
        ).all()
    )


def test_own_contacts_visible(two_users):
    alice, bob = two_users
    with Session(engine) as s:
        c = Contact(owner_id=alice.id, first_name="A")
        s.add(c)
        s.commit()
        s.refresh(c)
        assert c.id in visible_ids(s, alice)
        assert c.id not in visible_ids(s, bob)
        s.delete(c)
        s.commit()


def test_tag_shared_contact_visible(two_users):
    alice, bob = two_users
    with Session(engine) as s:
        c = Contact(owner_id=alice.id, first_name="Shared")
        t = Tag(owner_id=alice.id, name="joint")
        s.add(c)
        s.add(t)
        s.commit()
        s.refresh(c)
        s.refresh(t)
        s.add(ContactTag(contact_id=c.id, tag_id=t.id))
        s.add(TagShare(tag_id=t.id, grantee_id=bob.id))
        s.commit()
        assert c.id in visible_ids(s, bob)
        share = s.get(TagShare, (t.id, bob.id))
        s.delete(share)
        s.commit()
        assert c.id not in visible_ids(s, bob)
        s.delete(t)
        s.delete(c)
        s.commit()


def test_all_contacts_share_visible_for_existing_contact(two_users):
    alice, bob = two_users
    with Session(engine) as s:
        contact = Contact(owner_id=alice.id, first_name="Shared")
        s.add(contact)
        s.add(AllContactsShare(owner_id=alice.id, grantee_id=bob.id))
        s.commit()
        s.refresh(contact)

        assert contact.id in visible_ids(s, alice)
        assert contact.id in visible_ids(s, bob)

        s.delete(contact)
        s.commit()


def test_all_contacts_share_revoke_removes_visibility(two_users):
    alice, bob = two_users
    with Session(engine) as s:
        contact = Contact(owner_id=alice.id, first_name="Shared")
        share = AllContactsShare(owner_id=alice.id, grantee_id=bob.id)
        s.add(contact)
        s.add(share)
        s.commit()
        s.refresh(contact)

        assert contact.id in visible_ids(s, bob)

        s.delete(share)
        s.commit()

        assert contact.id not in visible_ids(s, bob)

        s.delete(contact)
        s.commit()


def test_all_contacts_share_applies_to_future_contacts(two_users):
    alice, bob = two_users
    with Session(engine) as s:
        s.add(AllContactsShare(owner_id=alice.id, grantee_id=bob.id))
        s.commit()

        future_contact = Contact(owner_id=alice.id, first_name="Future")
        s.add(future_contact)
        s.commit()
        s.refresh(future_contact)

        assert future_contact.id in visible_ids(s, bob)

        s.delete(future_contact)
        s.commit()


def test_all_contacts_share_self_row_does_not_expand_visibility(two_users):
    alice, bob = two_users
    with Session(engine) as s:
        alice_contact = Contact(owner_id=alice.id, first_name="Alice")
        bob_contact = Contact(owner_id=bob.id, first_name="Bob")
        s.add(alice_contact)
        s.add(bob_contact)
        s.add(AllContactsShare(owner_id=alice.id, grantee_id=alice.id))
        s.commit()
        s.refresh(alice_contact)
        s.refresh(bob_contact)

        assert visible_ids(s, alice) == {alice_contact.id}

        s.delete(alice_contact)
        s.delete(bob_contact)
        s.commit()


def test_all_contacts_share_excludes_soft_deleted_contacts(two_users):
    alice, bob = two_users
    with Session(engine) as s:
        contact = Contact(owner_id=alice.id, first_name="Soft Deleted")
        s.add(contact)
        s.add(AllContactsShare(owner_id=alice.id, grantee_id=bob.id))
        s.commit()

        contact.deleted_at = datetime.now(timezone.utc)
        s.add(contact)
        s.commit()
        s.refresh(contact)

        assert contact.id not in visible_ids(s, bob)
        assert contact.id in visible_ids(s, bob, include_deleted=True)

        s.delete(contact)
        s.commit()


def test_jit_user_creation():
    with Session(engine) as s:
        claims = {
            "iss": "https://team.cloudflareaccess.com",
            "sub": "new-abc",
            "email": f"new-{uuid.uuid4()}@t.x",
            "name": "New",
        }
        u1 = crud.get_or_create_user_from_claims(session=s, claims=claims)
        assert u1.oidc_sub == "new-abc"
        u2 = crud.get_or_create_user_from_claims(session=s, claims=claims)
        assert u1.id == u2.id
        s.delete(u1)
        s.commit()


def test_email_merge_existing_local_user():
    with Session(engine) as s:
        email = f"merge-{uuid.uuid4()}@t.x"
        local = User(email=email, hashed_password=get_password_hash("x"))
        s.add(local)
        s.commit()
        s.refresh(local)
        claims = {
            "iss": "https://team.cloudflareaccess.com",
            "sub": "merge-sub",
            "email": email,
            "name": "Merged",
        }
        u = crud.get_or_create_user_from_claims(session=s, claims=claims)
        s.refresh(u)
        assert u.id == local.id
        assert u.oidc_sub == "merge-sub"
        s.delete(u)
        s.commit()
