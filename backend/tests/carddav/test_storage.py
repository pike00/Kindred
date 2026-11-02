"""Regression tests for the database-backed Radicale collection."""

from __future__ import annotations

import contextlib

from radicale import item as radicale_item
from sqlmodel import Session, select

from app.carddav.storage import Collection
from app.models import Contact, ContactSource, User


class _SessionStorage:
    def __init__(self, session: Session) -> None:
        self._session = session

    @contextlib.contextmanager
    def get_session(self):
        yield self._session


def test_carddav_upload_persists_new_contact(
    db: Session,
    user: User,
) -> None:
    collection = Collection(
        _SessionStorage(db),
        path=f"{user.email}/contacts",
        user=str(user.email),
    )
    vcard = """BEGIN:VCARD
VERSION:3.0
UID:new-carddav-contact@example.com
FN:CardDAV Person
N:Person;CardDAV;;;
EMAIL;TYPE=HOME:carddav@example.com
END:VCARD"""
    uploaded = radicale_item.Item(
        collection_path=collection.path,
        text=vcard,
        href="new-carddav-contact.vcf",
        etag='"carddav-etag"',
        uid="new-carddav-contact@example.com",
    )

    collection.upload("new-carddav-contact.vcf", uploaded)

    stored = db.exec(select(Contact).where(Contact.owner_id == user.id)).all()
    assert len(stored) == 1
    assert stored[0].first_name == "CardDAV"
    assert stored[0].last_name == "Person"
    assert stored[0].source == ContactSource.CARDDAV
    assert stored[0].source_external_id == "new-carddav-contact@example.com"
    assert stored[0].vcard_sha256

    items = list(collection.get_all())
    assert len(items) == 1
    assert "FN:CardDAV Person" in items[0].serialize()
