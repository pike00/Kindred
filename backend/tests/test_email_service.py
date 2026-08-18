"""Tests for privacy-preserving email ingestion helpers."""

import uuid
from datetime import datetime, timezone

from app.email_service import (
    build_gmail_contact_query,
    interaction_exists,
    parse_email_addresses,
)
from app.models import Contact, Interaction, InteractionAttendee, InteractionChannel


def test_build_gmail_contact_query_matches_all_contact_addresses() -> None:
    query = build_gmail_contact_query({" Brisa@example.com ", "other@example.com"})

    assert query == "{from:brisa@example.com to:brisa@example.com from:other@example.com to:other@example.com}"
    assert "in:inbox" not in query
    assert "in:sent" not in query


def test_parse_email_addresses_handles_multiple_recipients() -> None:
    assert parse_email_addresses(
        "Brisa <brisa@example.com>, Another <another@example.com>"
    ) == ["brisa@example.com", "another@example.com"]


def test_interaction_exists_matches_attendee_link(
    session, user
) -> None:
    contact = Contact(owner_id=user.id, first_name=f"EmailTest-{uuid.uuid4().hex[:8]}")
    session.add(contact)
    session.flush()
    interaction = Interaction(
        owner_id=user.id,
        channel=InteractionChannel.EMAIL,
        occurred_at=datetime.now(timezone.utc),
        message_id=f"message-{uuid.uuid4().hex}",
    )
    session.add(interaction)
    session.flush()
    session.add(
        InteractionAttendee(interaction_id=interaction.id, contact_id=contact.id)
    )
    session.commit()

    assert interaction_exists(session, contact.id, interaction.message_id) is True
