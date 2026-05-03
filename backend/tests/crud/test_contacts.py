"""Tests for contact provenance (source, source_external_id) and upsert logic."""

from __future__ import annotations

import pytest
from sqlmodel import Session

from app.crud import create_contact, upsert_contact
from app.models import ContactCreate, ContactSource


def test_create_manual_contact_default_source(db: Session, user_factory):
    """Manual contacts default to source=MANUAL with no external ID."""
    user = user_factory()
    contact_in = ContactCreate(first_name="Alice")
    contact = create_contact(session=db, contact_in=contact_in, owner_id=user.id)

    assert contact.source == ContactSource.MANUAL
    assert contact.source_external_id is None


def test_create_contact_with_source(db: Session, user_factory):
    """Can create a contact with an explicit source and external ID."""
    user = user_factory()
    contact_in = ContactCreate(
        first_name="Bob",
        source=ContactSource.GOOGLE,
        source_external_id="google-id-123",
    )
    contact = create_contact(session=db, contact_in=contact_in, owner_id=user.id)

    assert contact.source == ContactSource.GOOGLE
    assert contact.source_external_id == "google-id-123"


def test_upsert_create_new(db: Session, user_factory):
    """upsert_contact creates a new contact when no match exists."""
    user = user_factory()
    contact_in = ContactCreate(
        first_name="Charlie",
        source=ContactSource.CARDDAV,
        source_external_id="carddav-uid-456",
    )
    contact = upsert_contact(session=db, contact_in=contact_in, owner_id=user.id)

    assert contact.id is not None
    assert contact.first_name == "Charlie"
    assert contact.source == ContactSource.CARDDAV
    assert contact.source_external_id == "carddav-uid-456"


def test_upsert_update_existing(db: Session, user_factory):
    """upsert_contact updates an existing contact when (owner, source, external_id) matches."""
    user = user_factory()

    # First create the contact
    contact_in = ContactCreate(
        first_name="Diana",
        source=ContactSource.GOOGLE,
        source_external_id="google-id-789",
        company="Old Company",
    )
    original = upsert_contact(session=db, contact_in=contact_in, owner_id=user.id)
    original_id = original.id

    # Now upsert with updated data
    update_in = ContactCreate(
        first_name="Diana",
        source=ContactSource.GOOGLE,
        source_external_id="google-id-789",
        company="New Company",
    )
    updated = upsert_contact(session=db, contact_in=update_in, owner_id=user.id)

    # Should be the same contact (updated)
    assert updated.id == original_id
    assert updated.company == "New Company"


def test_upsert_different_source_creates_separate(db: Session, user_factory):
    """Same external ID from different sources creates separate contacts."""
    user = user_factory()

    # Create from Google
    google_contact = upsert_contact(
        session=db,
        contact_in=ContactCreate(
            first_name="Eve",
            source=ContactSource.GOOGLE,
            source_external_id="same-external-id",
        ),
        owner_id=user.id,
    )

    # Create from CardDAV with same external ID (different source)
    carddav_contact = upsert_contact(
        session=db,
        contact_in=ContactCreate(
            first_name="Eve",
            source=ContactSource.CARDDAV,
            source_external_id="same-external-id",
        ),
        owner_id=user.id,
    )

    assert google_contact.id != carddav_contact.id
    assert google_contact.source == ContactSource.GOOGLE
    assert carddav_contact.source == ContactSource.CARDDAV


def test_upsert_no_external_id_creates_new(db: Session, user_factory):
    """When source_external_id is None, upsert falls through to normal create."""
    user = user_factory()

    contact1 = upsert_contact(
        session=db,
        contact_in=ContactCreate(first_name="Frank"),
        owner_id=user.id,
    )

    contact2 = upsert_contact(
        session=db,
        contact_in=ContactCreate(first_name="Frank"),
        owner_id=user.id,
    )

    # Should be two separate contacts (no upsert match without external_id)
    assert contact1.id != contact2.id


def test_unique_constraint_prevents_duplicate_external_id(db: Session, user_factory):
    """Unique constraint on (owner_id, source, source_external_id) prevents duplicates."""
    user = user_factory()

    contact_in = ContactCreate(
        first_name="Grace",
        source=ContactSource.WEBHOOK,
        source_external_id="webhook-id-999",
    )
    create_contact(session=db, contact_in=contact_in, owner_id=user.id)

    # Try to create another with same (owner, source, external_id)
    # This should fail due to unique constraint
    with pytest.raises(Exception):
        create_contact(session=db, contact_in=contact_in, owner_id=user.id)
        db.commit()


def test_multiple_manual_contacts_no_external_id(db: Session, user_factory):
    """Multiple manual contacts without external_id are allowed (NULL != NULL in PG)."""
    user = user_factory()

    contact1 = create_contact(
        session=db,
        contact_in=ContactCreate(first_name="Henry"),
        owner_id=user.id,
    )
    contact2 = create_contact(
        session=db,
        contact_in=ContactCreate(first_name="Iris"),
        owner_id=user.id,
    )

    assert contact1.source == ContactSource.MANUAL
    assert contact2.source == ContactSource.MANUAL
    assert contact1.source_external_id is None
    assert contact2.source_external_id is None
    assert contact1.id != contact2.id


def test_vcard_import_source(db: Session, user_factory):
    """vCard import source is stored correctly."""
    user = user_factory()

    contact = create_contact(
        session=db,
        contact_in=ContactCreate(
            first_name="Jack",
            source=ContactSource.VCARD_IMPORT,
            source_external_id="vcard-file.vcf",
        ),
        owner_id=user.id,
    )

    assert contact.source == ContactSource.VCARD_IMPORT
    assert contact.source_external_id == "vcard-file.vcf"


def test_upsert_updates_tags(db: Session, user_factory, tag_factory):
    """Upsert updates tag associations on existing contact."""
    user = user_factory()
    tag1 = tag_factory(user=user, name="original")
    tag2 = tag_factory(user=user, name="updated")

    # Create with tag1
    contact_in = ContactCreate(
        first_name="Kelly",
        source=ContactSource.GOOGLE,
        source_external_id="kelly-google-id",
        tag_ids=[tag1.id],
    )
    contact = upsert_contact(session=db, contact_in=contact_in, owner_id=user.id)
    assert len(contact.tags) == 1
    assert contact.tags[0].id == tag1.id

    # Upsert with tag2
    update_in = ContactCreate(
        first_name="Kelly",
        source=ContactSource.GOOGLE,
        source_external_id="kelly-google-id",
        tag_ids=[tag2.id],
    )
    updated = upsert_contact(session=db, contact_in=update_in, owner_id=user.id)
    assert updated.id == contact.id
    # Refresh to get updated tags
    db.refresh(updated, ["tags"])
    assert len(updated.tags) == 1
    assert updated.tags[0].id == tag2.id
