"""Tests for ContactField value validation.

Regression: contacts imported from iMessage carried a second PHONE field whose
value was the contact's own display name (e.g. "Margaret Valega"), which the UI
rendered as a broken `tel:Margaret Valega` link. The model accepted any string
as a phone/email value. These tests pin the validator that rejects a phone with
no digits and an email with no '@'.
"""

import uuid

import pytest
from pydantic import ValidationError

from app.models import (
    ContactFieldCreate,
    ContactFieldType,
    derive_handle_contact_field,
    validate_contact_field_value,
)


def test_phone_requires_a_digit() -> None:
    with pytest.raises(ValueError, match="digit"):
        validate_contact_field_value(ContactFieldType.PHONE, "Margaret Valega")


def test_email_requires_at_sign() -> None:
    with pytest.raises(ValueError, match="@"):
        validate_contact_field_value(ContactFieldType.EMAIL, "Margaret Valega")


@pytest.mark.parametrize(
    ("field_type", "value"),
    [
        (ContactFieldType.PHONE, "+13013518525"),
        (ContactFieldType.PHONE, "(301) 351-8525"),
        (ContactFieldType.EMAIL, "margaret@example.com"),
    ],
)
def test_valid_values_pass(field_type: ContactFieldType, value: str) -> None:
    assert validate_contact_field_value(field_type, value) == value


def test_value_is_trimmed() -> None:
    assert (
        validate_contact_field_value(ContactFieldType.PHONE, "  +1 555 0100 ")
        == "+1 555 0100"
    )


def test_contact_field_create_rejects_name_as_phone() -> None:
    """The API boundary model rejects a digit-less phone value."""
    with pytest.raises(ValidationError):
        ContactFieldCreate(
            contact_id=uuid.uuid4(),
            field_type=ContactFieldType.PHONE,
            label="phone",
            value="Margaret Valega",
        )


def test_contact_field_create_accepts_real_phone() -> None:
    field = ContactFieldCreate(
        contact_id=uuid.uuid4(),
        field_type=ContactFieldType.PHONE,
        label="phone",
        value="+13013518525",
    )
    assert field.value == "+13013518525"


@pytest.mark.parametrize(
    ("handle", "expected"),
    [
        # Channel-prefixed handles: the "imessage:"/"sms:" prefix is stripped.
        ("imessage:+15055544644", (ContactFieldType.PHONE, "+15055544644")),
        ("imessage:josh@example.com", (ContactFieldType.EMAIL, "josh@example.com")),
        ("sms:+15055544644", (ContactFieldType.PHONE, "+15055544644")),
        # Bare handles (what /imessage-sync stores in imessage_id).
        ("+15055544644", (ContactFieldType.PHONE, "+15055544644")),
        ("josh@example.com", (ContactFieldType.EMAIL, "josh@example.com")),
        ("  +1 505 554 4644  ", (ContactFieldType.PHONE, "+1 505 554 4644")),
        # Not usable as a phone or email → skipped (None) rather than raising.
        ("imessage:", None),
        ("Joshua Niforatos", None),
        ("", None),
        (None, None),
    ],
)
def test_derive_handle_contact_field(
    handle: str | None,
    expected: tuple[ContactFieldType, str] | None,
) -> None:
    assert derive_handle_contact_field(handle) == expected
