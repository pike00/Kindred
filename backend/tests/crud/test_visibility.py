import uuid

import pytest
from sqlmodel import Session, select

from app import crud
from app.core.db import engine
from app.core.security import get_password_hash
from app.models import Contact, ContactTag, Tag, TagShare, User


@pytest.fixture
def two_users():
    with Session(engine) as s:
        alice = User(email=f"alice-{uuid.uuid4()}@t.x",
                     hashed_password=get_password_hash("x"))
        bob = User(email=f"bob-{uuid.uuid4()}@t.x",
                   hashed_password=get_password_hash("x"))
        s.add(alice); s.add(bob); s.commit(); s.refresh(alice); s.refresh(bob)
        yield alice, bob
        s.delete(alice); s.delete(bob); s.commit()


def test_own_contacts_visible(two_users):
    alice, bob = two_users
    with Session(engine) as s:
        c = Contact(owner_id=alice.id, first_name="A")
        s.add(c); s.commit(); s.refresh(c)
        ids = list(s.exec(select(Contact.id).where(
            Contact.id.in_(crud.visible_contact_ids(alice)))).all())
        assert c.id in ids
        ids_bob = list(s.exec(select(Contact.id).where(
            Contact.id.in_(crud.visible_contact_ids(bob)))).all())
        assert c.id not in ids_bob
        s.delete(c); s.commit()


def test_tag_shared_contact_visible(two_users):
    alice, bob = two_users
    with Session(engine) as s:
        c = Contact(owner_id=alice.id, first_name="Shared")
        t = Tag(owner_id=alice.id, name="joint")
        s.add(c); s.add(t); s.commit(); s.refresh(c); s.refresh(t)
        s.add(ContactTag(contact_id=c.id, tag_id=t.id))
        s.add(TagShare(tag_id=t.id, grantee_id=bob.id))
        s.commit()
        ids_bob = list(s.exec(select(Contact.id).where(
            Contact.id.in_(crud.visible_contact_ids(bob)))).all())
        assert c.id in ids_bob
        share = s.get(TagShare, (t.id, bob.id))
        s.delete(share); s.commit()
        ids_bob = list(s.exec(select(Contact.id).where(
            Contact.id.in_(crud.visible_contact_ids(bob)))).all())
        assert c.id not in ids_bob
        s.delete(t); s.delete(c); s.commit()


def test_jit_user_creation():
    with Session(engine) as s:
        claims = {"iss": "https://team.cloudflareaccess.com", "sub": "new-abc",
                  "email": f"new-{uuid.uuid4()}@t.x", "name": "New"}
        u1 = crud.get_or_create_user_from_claims(session=s, claims=claims)
        assert u1.oidc_sub == "new-abc"
        u2 = crud.get_or_create_user_from_claims(session=s, claims=claims)
        assert u1.id == u2.id
        s.delete(u1); s.commit()


def test_email_merge_existing_local_user():
    with Session(engine) as s:
        email = f"merge-{uuid.uuid4()}@t.x"
        local = User(email=email, hashed_password=get_password_hash("x"))
        s.add(local); s.commit(); s.refresh(local)
        claims = {"iss": "https://team.cloudflareaccess.com", "sub": "merge-sub",
                  "email": email, "name": "Merged"}
        u = crud.get_or_create_user_from_claims(session=s, claims=claims)
        s.refresh(u)
        assert u.id == local.id
        assert u.oidc_sub == "merge-sub"
        s.delete(u); s.commit()
