"""CSV import/export utilities with auto-column detection and validation."""

import csv
import io
import re
from datetime import date
from typing import Any

from sqlalchemy.orm import Session
from sqlmodel import select

from app.models import (
    Contact,
    ContactField,
    ContactFieldType,
    Tag,
)

# Common header aliases for auto-detection
HEADER_ALIASES: dict[str, list[str]] = {
    "first_name": [
        "first_name",
        "firstname",
        "first",
        "given_name",
        "given",
        "fname",
    ],
    "last_name": [
        "last_name",
        "lastname",
        "last",
        "family_name",
        "family",
        "surname",
        "lname",
    ],
    "middle_name": [
        "middle_name",
        "middlename",
        "middle",
        "middle_initial",
        "mi",
    ],
    "prefix": [
        "prefix",
        "title",
        "honorific",
        "salutation",
    ],
    "suffix": [
        "suffix",
        "designation",
    ],
    "nickname": [
        "nickname",
        "nick",
        "preferred_name",
        "display_name",
    ],
    "company": [
        "company",
        "organization",
        "org",
        "employer",
        "workplace",
    ],
    "department": [
        "department",
        "dept",
        "division",
    ],
    "title": [
        "title",
        "job_title",
        "position",
        "role",
    ],
    "birthday": [
        "birthday",
        "birth_date",
        "date_of_birth",
        "dob",
        "birth",
    ],
    "how_we_met": [
        "how_we_met",
        "met",
        "introduction",
        "source",
    ],
    "is_favorite": [
        "is_favorite",
        "favorite",
        "fav",
        "starred",
    ],
    "is_archived": [
        "is_archived",
        "archived",
        "deleted",
    ],
    "contact_frequency_days": [
        "contact_frequency_days",
        "frequency",
        "cadence",
        "touch_frequency",
    ],
    "stage": [
        "stage",
        "kanban_stage",
        "status",
        "pipeline_stage",
    ],
    "email": [
        "email",
        "email_address",
        "email1",
        "primary_email",
        "e_mail",
    ],
    "phone": [
        "phone",
        "phone_number",
        "telephone",
        "mobile",
        "cell",
        "home_phone",
        "work_phone",
        "tel",
        "phone1",
    ],
    "address": [
        "address",
        "street_address",
        "full_address",
        "location",
    ],
    "city": [
        "city",
        "town",
        "locality",
    ],
    "region": [
        "region",
        "state",
        "province",
        "county",
        "st",
    ],
    "postal_code": [
        "postal_code",
        "zip",
        "zip_code",
        "postcode",
        "postal",
    ],
    "country": [
        "country",
        "nation",
    ],
    "tag_names": [
        "tags",
        "tag_names",
        "tag_list",
        "labels",
    ],
    "group_names": [
        "groups",
        "group_names",
        "group_list",
    ],
    "notes": [
        "notes",
        "note",
        "comments",
        "description",
        "remarks",
    ],
}


def detect_encoding(raw_bytes: bytes) -> str:
    """Detect text encoding from raw bytes.

    Tries UTF-8 BOM first, then common encodings, falls back to UTF-8.
    """
    # Check for BOM
    if raw_bytes.startswith(b"\xef\xbb\xbf"):
        return "utf-8-sig"
    if raw_bytes.startswith(b"\xff\xfe") or raw_bytes.startswith(b"\xfe\xff"):
        return "utf-16"

    # Try to decode with common encodings
    # UTF-8 first (most common)
    try:
        raw_bytes.decode("utf-8")
        return "utf-8"
    except UnicodeDecodeError:
        pass

    # Try ISO-8859-1 (Latin-1) - rarely fails
    try:
        raw_bytes.decode("iso-8859-1")
        return "iso-8859-1"
    except UnicodeDecodeError:
        pass

    # Try Windows-1252
    try:
        raw_bytes.decode("windows-1252")
        return "windows-1252"
    except UnicodeDecodeError:
        pass

    # Default to UTF-8 with error handling
    return "utf-8"


def normalize_header(header: str) -> str:
    """Normalize a CSV header for matching: lowercase, strip, replace spaces/underscores."""
    if not header:
        return ""
    # Replace spaces, dots, dashes with underscores
    normalized = re.sub(r"[\s.\-]+", "_", header.strip().lower())
    # Remove special characters except underscores
    normalized = re.sub(r"[^a-z0-9_]", "", normalized)
    return normalized


def detect_column_mapping(headers: list[str]) -> dict[str, str | None]:
    """Auto-detect column mapping from CSV headers.

    Returns a dict mapping normalized CSV headers to canonical field names.
    """
    mapping: dict[str, str | None] = {}
    normalized_headers = {normalize_header(h): h for h in headers if h}

    # Try to match each known field
    for canonical, aliases in HEADER_ALIASES.items():
        matched = False
        for alias in aliases:
            normalized_alias = normalize_header(alias)
            if normalized_alias in normalized_headers:
                original_header = normalized_headers[normalized_alias]
                mapping[original_header] = canonical
                matched = True
                break
        if not matched:
            # Check if any header contains the canonical name
            for norm_header, original_header in normalized_headers.items():
                if canonical in norm_header or any(
                    alias in norm_header for alias in aliases
                ):
                    mapping[original_header] = canonical
                    break

    return mapping


def normalize_email(email: str) -> str:
    """Normalize an email: lowercase and strip whitespace."""
    if not email:
        return ""
    return email.strip().lower()


def normalize_phone_to_e164(phone: str) -> str:
    """Attempt to normalize a phone number to E.164 format.

    Strips all non-digit characters except leading +, then ensures + prefix.
    This is a best-effort normalization, not a full parser.
    """
    if not phone:
        return ""

    # Strip whitespace
    phone = phone.strip()

    # If it already starts with +, keep it
    if phone.startswith("+"):
        digits = re.sub(r"[^\d]", "", phone[1:])
        return f"+{digits}"

    # Remove all non-digit characters
    digits = re.sub(r"[^\d]", "", phone)

    # If it's a US number with area code (10 digits), add +1
    if len(digits) == 10:
        return f"+1{digits}"
    # If it's 11 digits and starts with 1, assume US/Canada
    if len(digits) == 11 and digits[0] == "1":
        return f"+{digits}"
    # Otherwise just add +
    return f"+{digits}" if digits else ""


def parse_csv_content(
    content: bytes,
) -> tuple[list[str], list[dict[str, str]], str]:
    """Parse CSV content and return headers, rows, and detected encoding.

    Returns:
        Tuple of (headers, rows, encoding)
        - headers: list of column names
        - rows: list of dicts mapping header -> value
        - encoding: detected encoding string
    """
    encoding = detect_encoding(content)

    # Decode content
    text = content.decode(encoding, errors="replace")

    # Remove BOM if present (utf-8-sig should handle it, but just in case)
    if text.startswith("\ufeff"):
        text = text[1:]

    # Parse CSV
    reader = csv.DictReader(io.StringIO(text))
    headers = list(reader.fieldnames) if reader.fieldnames else []
    rows = list(reader)

    return headers, rows, encoding


def get_existing_tags(session: Session, owner_id: str) -> dict[str, Tag]:
    """Get existing tags for a user, keyed by lowercase name."""
    tags = session.exec(select(Tag).where(Tag.owner_id == owner_id)).all()
    return {tag.name.lower(): tag for tag in tags}



def get_existing_contacts_by_email(
    session: Session, owner_id: str
) -> dict[str, Contact]:
    """Get existing contacts for a user, keyed by normalized email.

    Only includes contacts that have at least one email field.
    """
    contacts = session.exec(select(Contact).where(Contact.owner_id == owner_id)).all()
    result: dict[str, Contact] = {}
    for contact in contacts:
        fields = session.exec(
            select(ContactField).where(
                (ContactField.contact_id == contact.id)
                & (ContactField.field_type == ContactFieldType.EMAIL)
            )
        ).all()
        for field in fields:
            normalized = normalize_email(field.value)
            if normalized:
                result[normalized] = contact
    return result


def build_contact_from_row(
    row: dict[str, str],
    column_mapping: dict[str, str | None],
    _owner_id: str,
) -> dict[str, Any]:
    """Build contact data from a CSV row using the column mapping.

    Returns a dict with 'contact_data', 'fields', 'tag_names', 'group_names'.
    """
    contact_data: dict[str, Any] = {}
    fields: list[dict[str, Any]] = []
    tag_names: list[str] = []
    group_names: list[str] = []
    addresses: list[dict[str, Any]] = []

    for csv_header, canonical in column_mapping.items():
        if not canonical:
            continue

        value = row.get(csv_header, "").strip()
        if not value:
            continue

        # Handle contact base fields
        if canonical in [
            "first_name",
            "last_name",
            "middle_name",
            "prefix",
            "suffix",
            "nickname",
            "company",
            "department",
            "title",
            "how_we_met",
            "stage",
        ]:
            contact_data[canonical] = value

        elif canonical == "birthday":
            try:
                # Try various date formats
                parsed_date = parse_date_flexible(value)
                if parsed_date:
                    contact_data["birthday"] = parsed_date
            except (ValueError, TypeError):
                pass

        elif canonical == "is_favorite":
            contact_data["is_favorite"] = value.lower() in (
                "true",
                "1",
                "yes",
                "y",
                "t",
            )

        elif canonical == "is_archived":
            contact_data["is_archived"] = value.lower() in (
                "true",
                "1",
                "yes",
                "y",
                "t",
            )

        elif canonical == "contact_frequency_days":
            try:
                days = int(value)
                if 1 <= days <= 3650:
                    contact_data["contact_frequency_days"] = days
            except (ValueError, TypeError):
                pass

        elif canonical == "email":
            normalized = normalize_email(value)
            if normalized:
                fields.append(
                    {
                        "field_type": ContactFieldType.EMAIL,
                        "label": "other",
                        "value": normalized,
                        "is_primary": True,
                    }
                )

        elif canonical == "phone":
            normalized = normalize_phone_to_e164(value)
            if normalized:
                fields.append(
                    {
                        "field_type": ContactFieldType.PHONE,
                        "label": "other",
                        "value": normalized,
                        "is_primary": True,
                    }
                )

        elif canonical == "tag_names":
            # Split by common separators: semicolon, comma
            names = re.split(r"[;,]+\s*", value)
            tag_names.extend([n.strip() for n in names if n.strip()])

        elif canonical == "group_names":
            names = re.split(r"[;,]+\s*", value)
            group_names.extend([n.strip() for n in names if n.strip()])

        elif canonical == "address":
            addresses.append({"label": "home", "street": value})

        elif canonical == "city":
            if addresses:
                addresses[-1]["city"] = value
            else:
                addresses.append({"label": "home", "city": value})

        elif canonical == "region":
            if addresses:
                addresses[-1]["region"] = value
            else:
                addresses.append({"label": "home", "region": value})

        elif canonical == "postal_code":
            if addresses:
                addresses[-1]["postal_code"] = value
            else:
                addresses.append({"label": "home", "postal_code": value})

        elif canonical == "country":
            if addresses:
                addresses[-1]["country"] = value
            else:
                addresses.append({"label": "home", "country": value})

    # Ensure first_name is present (required field)
    if "first_name" not in contact_data:
        # Try to extract from a full_name column or use a default
        contact_data["first_name"] = "Unknown"

    return {
        "contact_data": contact_data,
        "fields": fields,
        "tag_names": tag_names,
        "group_names": group_names,
        "addresses": addresses,
    }


def parse_date_flexible(date_str: str) -> date | None:
    """Try to parse a date string in various formats."""
    if not date_str:
        return None

    # Common date formats to try
    formats = [
        "%Y-%m-%d",
        "%m/%d/%Y",
        "%m/%d/%y",
        "%d/%m/%Y",
        "%d/%m/%y",
        "%Y%m%d",
        "%b %d, %Y",
        "%B %d, %Y",
        "%d %b %Y",
        "%d %B %Y",
    ]

    for fmt in formats:
        try:
            return date.strptime(date_str.strip(), fmt).date()
        except ValueError:
            continue

    return None


def export_contacts_to_csv(
    session: Session,
    owner_id: str,
    include_tags: bool = True,
    include_fields: bool = True,
) -> tuple[str, bytes]:
    """Export contacts to CSV format with UTF-8 BOM for Excel compatibility.

    Returns:
        Tuple of (filename, csv_bytes_with_bom)
    """
    contacts = session.exec(select(Contact).where(Contact.owner_id == owner_id)).all()

    # Build CSV rows
    output = io.StringIO()
    fieldnames = [
        "first_name",
        "last_name",
        "middle_name",
        "prefix",
        "suffix",
        "nickname",
        "company",
        "department",
        "title",
        "birthday",
        "how_we_met",
        "is_favorite",
        "is_archived",
        "contact_frequency_days",
        "stage",
    ]

    if include_fields:
        fieldnames.extend(["emails", "phones"])
    if include_tags:
        fieldnames.append("tag_names")

    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()

    for contact in contacts:
        row: dict[str, Any] = {
            "first_name": contact.first_name,
            "last_name": contact.last_name or "",
            "middle_name": contact.middle_name or "",
            "prefix": contact.prefix or "",
            "suffix": contact.suffix or "",
            "nickname": contact.nickname or "",
            "company": contact.company or "",
            "department": contact.department or "",
            "title": contact.title or "",
            "birthday": contact.birthday.isoformat() if contact.birthday else "",
            "how_we_met": contact.how_we_met or "",
            "is_favorite": str(contact.is_favorite).lower(),
            "is_archived": str(contact.is_archived).lower(),
            "contact_frequency_days": contact.contact_frequency_days or "",
            "stage": contact.stage or "",
        }

        if include_fields:
            # Get contact fields
            fields = session.exec(
                select(ContactField).where(ContactField.contact_id == contact.id)
            ).all()

            emails = [f.value for f in fields if f.field_type == ContactFieldType.EMAIL]
            phones = [f.value for f in fields if f.field_type == ContactFieldType.PHONE]

            row["emails"] = "; ".join(emails)
            row["phones"] = "; ".join(phones)

        if include_tags:
            tag_names = [tag.name for tag in contact.tags]
            row["tag_names"] = "; ".join(tag_names)

        writer.writerow(row)

    # Add UTF-8 BOM for Excel compatibility
    csv_str = output.getvalue()
    csv_bytes = b"\xef\xbb\xbf" + csv_str.encode("utf-8")

    return "contacts.csv", csv_bytes
