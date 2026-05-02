"""Tests for vCard parsing and generation utilities."""

from app.models import Address, Contact, ContactField, ContactFieldType
from app.vcard import compute_etag, contact_to_vcard, vcard_to_contact_data


def test_compute_etag():
    """Test ETag computation from vCard text."""
    vcard = "BEGIN:VCARD\nVERSION:3.0\nFN:Test User\nEND:VCARD"
    etag = compute_etag(vcard)
    assert etag != ""
    assert etag.startswith('"')
    assert etag.endswith('"')
    # Same content should produce same ETag
    etag2 = compute_etag(vcard)
    assert etag == etag2
    # Different content should produce different ETag
    vcard2 = "BEGIN:VCARD\nVERSION:3.0\nFN:Other User\nEND:VCARD"
    etag3 = compute_etag(vcard2)
    assert etag != etag3


def test_contact_to_vcard_basic():
    """Test basic vCard generation from Contact."""
    contact = Contact(
        first_name="John",
        last_name="Doe",
        owner_id="123e4567-e89b-12d3-a456-426614174000",
    )
    vcard_text = contact_to_vcard(contact, fields=[], addresses=[])
    assert "BEGIN:VCARD" in vcard_text
    assert "FN:John Doe" in vcard_text
    assert "N:Doe;John;;;" in vcard_text


def test_contact_to_vcard_with_fields():
    """Test vCard generation with phone and email fields."""
    contact = Contact(
        first_name="Jane",
        last_name="Smith",
        owner_id="123e4567-e89b-12d3-a456-426614174000",
    )
    fields = [
        ContactField(
            field_type=ContactFieldType.EMAIL,
            label="work",
            value="jane@example.com",
            is_primary=True,
        ),
        ContactField(
            field_type=ContactFieldType.PHONE,
            label="cell",
            value="+1-555-1234",
        ),
    ]
    vcard_text = contact_to_vcard(contact, fields=fields, addresses=[])
    assert "jane@example.com" in vcard_text
    assert "+1-555-1234" in vcard_text
    assert "TYPE=WORK" in vcard_text or "TYPE=cell" in vcard_text


def test_contact_to_vcard_with_address():
    """Test vCard generation with address."""
    contact = Contact(
        first_name="Bob",
        last_name="Johnson",
        owner_id="123e4567-e89b-12d3-a456-426614174000",
    )
    addresses = [
        Address(
            label="home",
            street="123 Main St",
            city="Anytown",
            region="CA",
            postal_code="12345",
            country="USA",
        ),
    ]
    vcard_text = contact_to_vcard(contact, fields=[], addresses=addresses)
    assert "123 Main St" in vcard_text
    assert "Anytown" in vcard_text


def test_contact_to_vcard_with_crm_fields():
    """Test vCard generation with CRM-specific fields."""
    contact = Contact(
        first_name="Alice",
        last_name="Wonder",
        nickname="Ali",
        company="Acme Corp",
        title="Engineer",
        how_we_met="At a conference",
        is_favorite=True,
        stage="Active",
        contact_frequency_days=30,
        avatar_url="https://example.com/avatar.jpg",
        owner_id="123e4567-e89b-12d3-a456-426614174000",
    )
    vcard_text = contact_to_vcard(contact, fields=[], addresses=[])
    assert "NICKNAME:Ali" in vcard_text
    assert "NOTE:At a conference" in vcard_text or "NOTE" in vcard_text
    assert "X-CRM-FAVORITE:TRUE" in vcard_text
    assert "X-CRM-STAGE:Active" in vcard_text
    assert "X-CRM-FREQUENCY-DAYS:30" in vcard_text
    assert "PHOTO" in vcard_text
    assert "https://example.com/avatar.jpg" in vcard_text


def test_vcard_to_contact_data_basic():
    """Test parsing basic vCard text."""
    vcard_text = """BEGIN:VCARD
VERSION:3.0
FN:John Doe
N:Doe;John;;;
END:VCARD"""
    result = vcard_to_contact_data(vcard_text)
    assert result["contact"]["first_name"] == "John"
    assert result["contact"]["last_name"] == "Doe"


def test_vcard_to_contact_data_with_fields():
    """Test parsing vCard with email and phone."""
    vcard_text = """BEGIN:VCARD
VERSION:3.0
FN:Jane Smith
N:Smith;Jane;;;
EMAIL;TYPE=WORK:jane@example.com
TEL;TYPE=CELL:+1-555-1234
END:VCARD"""
    result = vcard_to_contact_data(vcard_text)
    assert len(result["fields"]) == 2
    emails = [f for f in result["fields"] if f["field_type"] == "email"]
    phones = [f for f in result["fields"] if f["field_type"] == "phone"]
    assert len(emails) == 1
    assert emails[0]["value"] == "jane@example.com"
    assert len(phones) == 1
    assert phones[0]["value"] == "+1-555-1234"


def test_vcard_to_contact_data_with_crm_fields():
    """Test parsing vCard with CRM-specific X-properties."""
    vcard_text = """BEGIN:VCARD
VERSION:3.0
FN:Alice Wonder
N:Wonder;Alice;;;
NICKNAME:Ali
NOTE:At a conference
X-CRM-FAVORITE:TRUE
X-CRM-STAGE:Active
X-CRM-FREQUENCY-DAYS:30
END:VCARD"""
    result = vcard_to_contact_data(vcard_text)
    assert result["contact"]["nickname"] == "Ali"
    assert result["contact"]["how_we_met"] == "At a conference"
    assert result["contact"]["is_favorite"] is True
    assert result["contact"]["stage"] == "Active"
    assert result["contact"]["contact_frequency_days"] == 30


def test_round_trip():
    """Test that vCard generation and parsing is consistent."""
    contact = Contact(
        first_name="Test",
        last_name="User",
        nickname="TU",
        company="Test Corp",
        title="Tester",
        owner_id="123e4567-e89b-12d3-a456-426614174000",
    )
    fields = [
        ContactField(
            field_type=ContactFieldType.EMAIL,
            label="work",
            value="test@example.com",
        ),
    ]
    # Generate vCard
    vcard_text = contact_to_vcard(contact, fields=fields, addresses=[])
    # Parse it back
    result = vcard_to_contact_data(vcard_text)
    assert result["contact"]["first_name"] == "Test"
    assert result["contact"]["last_name"] == "User"
    assert result["contact"]["nickname"] == "TU"
    assert len(result["fields"]) == 1
