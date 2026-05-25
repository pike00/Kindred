"""Utility for generating contact-related message templates with pronoun support."""

from app.models import Contact


def get_pronoun_greeting(contact: Contact) -> str:
    """Generate a greeting using the contact's pronouns if available.

    Args:
        contact: The contact to generate a greeting for.

    Returns:
        A greeting string like "Hi Alex" or "Hi Jordan (they/them)"
    """
    name = contact.first_name
    if contact.pronouns:
        return f"Hi {name} ({contact.pronouns})"
    return f"Hi {name}"


def get_follow_up_message(contact: Contact, context: str = "") -> str:
    """Generate a follow-up message for a contact.

    Args:
        contact: The contact to follow up with.
        context: Optional context about the interaction.

    Returns:
        A follow-up message string.
    """
    name = contact.first_name
    pronouns_part = f" ({contact.pronouns})" if contact.pronouns else ""

    base = f"Hi {name}{pronouns_part}, I wanted to follow up with you."

    if context:
        return f"{base} {context}"

    return base


def get_contact_context(contact: Contact) -> str:
    """Generate context string for a contact including pronouns and timezone.

    Args:
        contact: The contact to generate context for.

    Returns:
        A context string with contact details.
    """
    parts = [f"Name: {contact.first_name} {contact.last_name or ''}".strip()]

    if contact.pronouns:
        parts.append(f"Pronouns: {contact.pronouns}")

    if contact.timezone:
        parts.append(f"Timezone: {contact.timezone}")

    if contact.company:
        company_str = (
            f"{contact.title} at {contact.company}"
            if contact.title
            else contact.company
        )
        parts.append(f"Company: {company_str}")

    return "\n".join(parts)
