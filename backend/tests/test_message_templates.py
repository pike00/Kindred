"""Tests for message template utilities with pronoun support."""

from app.models import Contact
from app.utils.message_templates import (
    get_contact_context,
    get_follow_up_message,
    get_pronoun_greeting,
)


def test_get_pronoun_greeting_with_pronouns() -> None:
    """Test greeting generation with pronouns."""
    contact = Contact(
        first_name="Alex",
        pronouns="they/them",
    )
    greeting = get_pronoun_greeting(contact)
    assert greeting == "Hi Alex (they/them)"


def test_get_pronoun_greeting_without_pronouns() -> None:
    """Test greeting generation without pronouns."""
    contact = Contact(
        first_name="Jordan",
    )
    greeting = get_pronoun_greeting(contact)
    assert greeting == "Hi Jordan"


def test_get_follow_up_message_with_pronouns() -> None:
    """Test follow-up message with pronouns."""
    contact = Contact(
        first_name="Sam",
        pronouns="they/them",
    )
    message = get_follow_up_message(contact, "Let's catch up soon!")
    assert "Sam" in message
    assert "they/them" in message
    assert "Let's catch up soon!" in message


def test_get_follow_up_message_without_pronouns() -> None:
    """Test follow-up message without pronouns."""
    contact = Contact(
        first_name="Taylor",
    )
    message = get_follow_up_message(contact)
    assert "Hi Taylor" in message
    assert "()" not in message


def test_get_contact_context_with_all_fields() -> None:
    """Test contact context generation with all fields."""
    contact = Contact(
        first_name="Alex",
        last_name="Chen",
        pronouns="they/them",
        timezone="America/New_York",
        company="Acme Corp",
        title="Engineer",
    )
    context = get_contact_context(contact)
    assert "Alex Chen" in context
    assert "they/them" in context
    assert "America/New_York" in context
    assert "Engineer at Acme Corp" in context


def test_get_contact_context_minimal() -> None:
    """Test contact context generation with minimal fields."""
    contact = Contact(
        first_name="Bob",
    )
    context = get_contact_context(contact)
    assert "Bob" in context
    assert "Pronouns:" not in context
    assert "Timezone:" not in context
