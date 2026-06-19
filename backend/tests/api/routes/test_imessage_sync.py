"""Tests for the /contacts/imessage-sync endpoint.

Pins the behavior that an iMessage handle is surfaced as a dialable phone/email
ContactField (so it shows in the Contact Information card), not just stored in
source_external_id / imessage_id for the source badge.
"""

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.core.config import settings
from app.models import Contact, ContactField, ContactFieldType


def _sync(client: TestClient, headers: dict[str, str], imessage_id: str):
    return client.post(
        f"{settings.API_V1_STR}/contacts/imessage-sync",
        headers=headers,
        json={"profiles": [{"imessage_id": imessage_id}]},
    )


def test_sync_creates_phone_contact_field(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    imessage_id = "+15055551234"
    r = _sync(client, superuser_token_headers, imessage_id)
    assert r.status_code == 200
    assert r.json()["created_count"] == 1

    contact = db.exec(select(Contact).where(Contact.imessage_id == imessage_id)).first()
    assert contact is not None

    fields = db.exec(
        select(ContactField).where(ContactField.contact_id == contact.id)
    ).all()
    phone = [f for f in fields if f.field_type == ContactFieldType.PHONE]
    assert len(phone) == 1
    assert phone[0].value == imessage_id
    assert phone[0].label == "iMessage"
    # First field of its type → primary.
    assert phone[0].is_primary is True


def test_sync_creates_email_field_for_email_handle(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    imessage_id = "imsg.user@example.com"
    r = _sync(client, superuser_token_headers, imessage_id)
    assert r.status_code == 200

    contact = db.exec(select(Contact).where(Contact.imessage_id == imessage_id)).first()
    assert contact is not None
    fields = db.exec(
        select(ContactField).where(ContactField.contact_id == contact.id)
    ).all()
    assert [f.field_type for f in fields] == [ContactFieldType.EMAIL]
    assert fields[0].value == imessage_id


def test_sync_does_not_duplicate_field_on_resync(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    imessage_id = "+15055559876"
    _sync(client, superuser_token_headers, imessage_id)
    # A second sync with a changed profile re-runs the update path; the field
    # upsert must stay idempotent (no duplicate phone field).
    r2 = client.post(
        f"{settings.API_V1_STR}/contacts/imessage-sync",
        headers=superuser_token_headers,
        json={"profiles": [{"imessage_id": imessage_id, "topics": ["golf"]}]},
    )
    assert r2.status_code == 200

    contact = db.exec(select(Contact).where(Contact.imessage_id == imessage_id)).first()
    assert contact is not None
    phone = db.exec(
        select(ContactField).where(
            ContactField.contact_id == contact.id,
            ContactField.field_type == ContactFieldType.PHONE,
        )
    ).all()
    assert len(phone) == 1
