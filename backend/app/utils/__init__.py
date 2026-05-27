"""Utils package for the CRM application."""

from app.utils.email import (
    EmailData,
    generate_new_account_email,
    generate_password_reset_token,
    generate_reset_password_email,
    generate_test_email,
    render_email_template,
    send_email,
    verify_password_reset_token,
)
from app.utils.message_templates import (
    get_contact_context,
    get_follow_up_message,
    get_pronoun_greeting,
)

__all__ = [
    "EmailData",
    "generate_new_account_email",
    "generate_password_reset_token",
    "generate_reset_password_email",
    "generate_test_email",
    "render_email_template",
    "send_email",
    "verify_password_reset_token",
    "get_pronoun_greeting",
    "get_follow_up_message",
    "get_contact_context",
]
