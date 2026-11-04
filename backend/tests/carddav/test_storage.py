"""Regression tests for the database-backed Radicale collection."""

from __future__ import annotations

import contextlib

from radicale import item as radicale_item
from sqlmodel import Session, select

from app.carddav.storage import Collection
from app.models import Address, Contact, ContactField, ContactSource, User


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
ADR;TYPE=HOME:;;123 Main St;Chicago;IL;60601;USA
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
    assert stored[0].vcard_href == "new-carddav-contact.vcf"
    assert stored[0].vcard_sha256

    fields = db.exec(
        select(ContactField).where(ContactField.contact_id == stored[0].id)
    ).all()
    assert any(field.value == "carddav@example.com" for field in fields)
    addresses = db.exec(select(Address).where(Address.contact_id == stored[0].id)).all()
    assert len(addresses) == 1
    assert addresses[0].city == "Chicago"

    round_trip = list(collection.get_multi(["new-carddav-contact.vcf"]))
    assert round_trip[0][1] is not None
    assert "FN:CardDAV Person" in round_trip[0][1].serialize()

    items = list(collection.get_all())
    assert len(items) == 1
    assert "FN:CardDAV Person" in items[0].serialize()
    assert items[0].href == "new-carddav-contact.vcf"

    changed_uid = """BEGIN:VCARD
VERSION:3.0
UID:new-carddav-contact-v2@example.com
FN:CardDAV Person Updated
N:Person;CardDAV Updated;;;
EMAIL;TYPE=HOME:carddav-updated@example.com
END:VCARD"""
    updated = radicale_item.Item(
        collection_path=collection.path,
        text=changed_uid,
        href="new-carddav-contact.vcf",
        etag='"carddav-etag-v2"',
        uid="new-carddav-contact-v2@example.com",
    )

    collection.upload("new-carddav-contact.vcf", updated)

    stored = db.exec(select(Contact).where(Contact.owner_id == user.id)).all()
    assert len(stored) == 1
    assert stored[0].first_name == "CardDAV Updated"
    assert stored[0].source_external_id == "new-carddav-contact-v2@example.com"


def test_carddav_soft_delete_hides_and_restores_existing_contact(
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
UID:soft-delete-carddav@example.com
FN:CardDAV Restore
N:Restore;CardDAV;;;
EMAIL;TYPE=HOME:restore@example.com
END:VCARD"""
    uploaded = radicale_item.Item(
        collection_path=collection.path,
        text=vcard,
        href="soft-delete-carddav.vcf",
        etag='"soft-delete-etag"',
        uid="soft-delete-carddav@example.com",
    )

    collection.upload("soft-delete-carddav.vcf", uploaded)
    contact = db.exec(select(Contact).where(Contact.owner_id == user.id)).one()
    contact.deleted_at = contact.updated_at
    db.add(contact)
    db.commit()

    assert list(collection.get_all()) == []

    collection.upload("soft-delete-carddav.vcf", uploaded)
    restored = db.exec(select(Contact).where(Contact.owner_id == user.id)).one()
    assert restored.deleted_at is None
    assert restored.vcard_href == "soft-delete-carddav.vcf"


def test_carddav_delete_soft_deletes_and_can_restore(
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
UID:delete-carddav@example.com
FN:CardDAV Delete
N:Delete;CardDAV;;;
END:VCARD"""
    uploaded = radicale_item.Item(
        collection_path=collection.path,
        text=vcard,
        href="delete-carddav.vcf",
        etag='"delete-etag"',
        uid="delete-carddav@example.com",
    )

    collection.upload("delete-carddav.vcf", uploaded)
    collection.delete("delete-carddav.vcf")

    contact = db.exec(select(Contact).where(Contact.owner_id == user.id)).one()
    assert contact.deleted_at is not None
    assert list(collection.get_all()) == []

    collection.upload("delete-carddav.vcf", uploaded)
    db.refresh(contact)
    assert contact.deleted_at is None
