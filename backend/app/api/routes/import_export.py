"""Import and export routes for vCard and CSV files."""

import logging
from typing import Any

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from fastapi.responses import Response
from sqlmodel import SQLModel, select

from app.api.deps import CurrentUser, SessionDep
from app.crud import upsert_contact
from app.csv_utils import (
    build_contact_from_row,
    detect_column_mapping,
    export_contacts_to_csv,
    get_existing_contacts_by_email,
    get_existing_tags,
    normalize_email,
    parse_csv_content,
)
from app.models import (
    Address,
    Contact,
    ContactCreate,
    ContactField,
    ContactFieldType,
    ContactSource,
    ContactTag,
    Tag,
)
from app.vcard import contact_to_vcard, vcard_to_contact_data

router = APIRouter(prefix="/import-export", tags=["import-export"])


class VCardImportResponse(SQLModel):
    """Result of a vCard bulk import."""

    imported: int
    errors: list[str] = []


class JsonExportResponse(SQLModel):
    """JSON export of all contact rows (raw model_dump per contact)."""

    contacts: list[dict]


@router.post("/import/vcard", response_model=VCardImportResponse)
async def import_vcard(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    file: UploadFile = File(...),
) -> VCardImportResponse:
    """Import contacts from a .vcf file (supports multiple vCards in one file)."""
    content = await file.read()
    text = content.decode("utf-8", errors="replace")

    imported = 0
    errors = []

    for card_text in _split_vcards(text):
        try:
            parsed = vcard_to_contact_data(card_text)
            contact_data = parsed["contact"]

            # Get vCard UID for source_external_id
            vcard_uid = parsed.get("uid")
            source_external_id = str(vcard_uid) if vcard_uid else None

            # Create ContactCreate with provenance fields
            contact_in = ContactCreate(
                **contact_data,
                source=ContactSource.VCARD_IMPORT,
                source_external_id=source_external_id,
                tag_ids=[],
            )

            # Use upsert_contact for idempotent import
            contact = upsert_contact(
                session=session, contact_in=contact_in, owner_id=current_user.id
            )

            # Update vcard_raw if available
            if parsed.get("vcard_raw"):
                contact.vcard_raw = parsed["vcard_raw"]
                session.add(contact)

            session.commit()
            session.refresh(contact)

            # Handle contact fields (idempotent: delete existing, create new)
            from app.models import ContactField, ContactFieldType

            # Delete existing fields for this contact
            existing_fields = session.exec(
                select(ContactField).where(ContactField.contact_id == contact.id)
            ).all()
            for field in existing_fields:
                session.delete(field)

            for field_data in parsed["fields"]:
                cf = ContactField(
                    contact_id=contact.id,
                    field_type=ContactFieldType(field_data["field_type"]),
                    label=field_data.get("label", "other"),
                    value=field_data["value"],
                    is_primary=field_data.get("is_primary", False),
                )
                session.add(cf)

            # Handle addresses (idempotent: delete existing, create new)
            from app.models import Address

            # Delete existing addresses for this contact
            existing_addresses = session.exec(
                select(Address).where(Address.contact_id == contact.id)
            ).all()
            for addr in existing_addresses:
                session.delete(addr)

            for addr_data in parsed["addresses"]:
                addr = Address(contact_id=contact.id, **addr_data)
                session.add(addr)

            session.commit()
            imported += 1

        except Exception as e:
            errors.append(str(e))

    return VCardImportResponse(imported=imported, errors=errors)


@router.get("/export/vcard")
def export_vcard(
    session: SessionDep,
    current_user: CurrentUser,
) -> Response:
    """Export all contacts as a single .vcf file."""
    contacts = session.exec(
        select(Contact).where(Contact.owner_id == current_user.id)
    ).all()

    vcards = []
    for contact in contacts:
        if contact.vcard_raw:
            vcards.append(contact.vcard_raw)
        else:
            fields = session.exec(
                select(ContactField).where(ContactField.contact_id == contact.id)
            ).all()
            addresses = session.exec(
                select(Address).where(Address.contact_id == contact.id)
            ).all()
            vcards.append(contact_to_vcard(contact, fields, addresses))

    content = "\r\n".join(vcards)
    return Response(
        content=content,
        media_type="text/vcard",
        headers={"Content-Disposition": "attachment; filename=contacts.vcf"},
    )


@router.get("/export/json", response_model=JsonExportResponse)
def export_json(
    session: SessionDep,
    current_user: CurrentUser,
) -> JsonExportResponse:
    """Export all data as JSON."""
    # This will be expanded as more models are added
    contacts = session.exec(
        select(Contact).where(Contact.owner_id == current_user.id)
    ).all()
    return JsonExportResponse(contacts=[c.model_dump() for c in contacts])


def _split_vcards(text: str) -> list[str]:
    """Split a multi-vCard file into individual vCard strings."""
    cards = []
    current = []
    for line in text.splitlines():
        current.append(line)
        if line.strip().upper() == "END:VCARD":
            cards.append("\r\n".join(current))
            current = []
    return cards


logger = logging.getLogger(__name__)


# ─── CSV Import Preview ───────────────────────────────────────────────────────


class CSVPreviewResponse(SQLModel):
    """Preview of CSV import: column mapping and sample rows."""

    headers: list[str]
    detected_mapping: dict[str, str | None]
    sample_rows: list[dict[str, str]]
    total_rows: int
    encoding: str


@router.post("/import/csv/preview", response_model=CSVPreviewResponse)
async def preview_csv_import(
    *,
    file: UploadFile = File(...),
) -> Any:
    """Preview CSV import: detect columns and show sample rows.

    Returns the detected column mapping and first few rows for user confirmation.
    """
    content = await file.read()
    headers, rows, encoding = parse_csv_content(content)

    # Detect column mapping
    column_mapping = detect_column_mapping(headers)

    # Return sample (first 5 rows)
    sample = rows[:5]

    return CSVPreviewResponse(
        headers=headers,
        detected_mapping=column_mapping,
        sample_rows=sample,
        total_rows=len(rows),
        encoding=encoding,
    )


# ─── CSV Import ─────────────────────────────────────────────────────────────


class CSVImportRequest(SQLModel):
    """Request body for CSV import with column mapping override."""

    column_mapping: dict[str, str | None] | None = None
    skip_duplicates: bool = True
    merge_duplicates: bool = False
    create_missing_tags: bool = True


class CSVImportResponse(SQLModel):
    """Response for CSV import."""

    imported: int
    skipped: int
    updated: int
    errors: list[str]
    tag_names_created: list[str] = []


@router.post("/import/csv", response_model=CSVImportResponse)
async def import_csv(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    file: UploadFile = File(...),
    column_mapping: dict[str, str | None] | None = None,
    skip_duplicates: bool = Query(True),
    merge_duplicates: bool = Query(False),
    create_missing_tags: bool = Query(True),
) -> Any:
    """Import contacts from a CSV file.

    - **column_mapping**: Optional override for auto-detected column mapping.
    - **skip_duplicates**: Skip contacts with matching email (default: True).
    - **merge_duplicates**: Update existing contacts with matching email (default: False).
    - **create_missing_tags**: Auto-create tags that don't exist (default: True).
    """
    content = await file.read()
    headers, rows, _ = parse_csv_content(content)

    # Use provided mapping or auto-detect
    if column_mapping:
        # Validate: ensure all values are valid field names
        valid_fields = [
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
            "email",
            "phone",
            "address",
            "city",
            "region",
            "postal_code",
            "country",
            "tag_names",
            "group_names",
            "notes",
        ]
        for _h, field in column_mapping.items():
            if field and field not in valid_fields:
                raise HTTPException(
                    status_code=422,
                    detail=f"Invalid field name in mapping: {field}",
                )
    else:
        column_mapping = detect_column_mapping(headers)

    # Get existing data for dedupe
    existing_contacts = get_existing_contacts_by_email(session, str(current_user.id))
    existing_tags = get_existing_tags(session, str(current_user.id))

    imported = 0
    skipped = 0
    updated = 0
    errors: list[str] = []
    tags_created: list[str] = []

    for row_idx, row in enumerate(rows, start=2):  # Row 1 is header
        try:
            # Build contact data from row
            parsed = build_contact_from_row(row, column_mapping, str(current_user.id))
            contact_data = parsed["contact_data"]
            fields = parsed["fields"]
            tag_names = parsed["tag_names"]
            addresses = parsed["addresses"]

            # Check for duplicates by email
            existing_contact = None
            row_emails = [
                f["value"] for f in fields if f["field_type"] == ContactFieldType.EMAIL
            ]
            for email in row_emails:
                normalized = normalize_email(email)
                if normalized in existing_contacts:
                    existing_contact = existing_contacts[normalized]
                    break

            if existing_contact and skip_duplicates and not merge_duplicates:
                skipped += 1
                continue

            if existing_contact and merge_duplicates:
                # Update existing contact
                for key, value in contact_data.items():
                    if value is not None:
                        setattr(existing_contact, key, value)
                session.add(existing_contact)
                session.commit()

                # Update fields (replace email/phone)
                for field_data in fields:
                    # Check if field already exists
                    existing_field = session.exec(
                        select(ContactField).where(
                            (ContactField.contact_id == existing_contact.id)
                            & (ContactField.field_type == field_data["field_type"])
                            & (ContactField.value == field_data["value"])
                        )
                    ).first()
                    if not existing_field:
                        cf = ContactField(
                            contact_id=existing_contact.id,
                            **field_data,
                        )
                        session.add(cf)
                session.commit()
                updated += 1
                continue

            # Create new contact
            contact_create = ContactCreate(**contact_data)
            contact = Contact(
                owner_id=current_user.id,
                **contact_create.model_dump(),
            )
            session.add(contact)
            session.commit()
            session.refresh(contact)

            # Create contact fields
            for field_data in fields:
                cf = ContactField(
                    contact_id=contact.id,
                    **field_data,
                )
                session.add(cf)

            # Create addresses
            for addr_data in addresses:
                addr = Address(contact_id=contact.id, **addr_data)
                session.add(addr)

            # Handle tags
            for tag_name in tag_names:
                tag_name_lower = tag_name.lower()
                if tag_name_lower in existing_tags:
                    tag = existing_tags[tag_name_lower]
                elif create_missing_tags:
                    tag = Tag(
                        name=tag_name,
                        owner_id=current_user.id,
                    )
                    session.add(tag)
                    session.commit()
                    session.refresh(tag)
                    existing_tags[tag_name_lower] = tag
                    tags_created.append(tag_name)
                else:
                    continue

                # Link tag to contact
                existing_link = session.exec(
                    select(ContactTag).where(
                        (ContactTag.contact_id == contact.id)
                        & (ContactTag.tag_id == tag.id)
                    )
                ).first()
                if not existing_link:
                    session.add(ContactTag(contact_id=contact.id, tag_id=tag.id))

            # Handle groups
            session.commit()
            imported += 1

        except Exception as e:
            errors.append(f"Row {row_idx}: {str(e)}")
            logger.warning(f"CSV import error on row {row_idx}: {e}")

    return CSVImportResponse(
        imported=imported,
        skipped=skipped,
        updated=updated,
        errors=errors,
        tag_names_created=tags_created,
    )


# ─── CSV Export ─────────────────────────────────────────────────────────────


@router.get("/export/csv")
def export_csv(
    session: SessionDep,
    current_user: CurrentUser,
    include_tags: bool = Query(True),
    include_fields: bool = Query(True),
) -> Any:
    """Export all contacts as a CSV file with UTF-8 BOM for Excel compatibility.

    - **include_tags**: Include tag names column (default: True).
    - **include_fields**: Include emails and phones columns (default: True).
    """
    filename, csv_bytes = export_contacts_to_csv(
        session=session,
        owner_id=str(current_user.id),
        include_tags=include_tags,
        include_fields=include_fields,
    )

    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Content-Type": "text/csv; charset=utf-8",
        },
    )
