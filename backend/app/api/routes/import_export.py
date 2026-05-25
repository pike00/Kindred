"""Import and export routes for vCard and CSV files."""

import uuid
from typing import Any

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import selectinload
from sqlmodel import col, select

from app.api.deps import CurrentUser, SessionDep
from app.crud import upsert_contact
from app.models import (
    Address,
    Contact,
    ContactCreate,
    ContactField,
    ContactSource,
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
                group_ids=[],
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


@router.get("/export/csv")
def export_csv(
    session: SessionDep,
    current_user: CurrentUser,
    select_all_filtered: bool = False,
    search: str | None = None,
    tag_id: uuid.UUID | None = None,
    group_id: uuid.UUID | None = None,
    is_favorite: bool | None = None,
    is_archived: bool | None = None,
    stage: str | None = None,
    limit: int = 500,
) -> Any:
    """Export contacts as CSV file."""
    import csv
    from io import StringIO

    limit = min(max(1, limit), 500)

    stmt = select(Contact).where(
        Contact.id.in_(visible_contact_ids(current_user, include_deleted=False))
    )

    if is_archived is not None:
        stmt = stmt.where(Contact.is_archived == is_archived)
    elif select_all_filtered:
        stmt = stmt.where(Contact.is_archived.is_(False))

    if is_favorite is not None:
        stmt = stmt.where(Contact.is_favorite == is_favorite)
    if stage is not None:
        stmt = stmt.where(Contact.stage == stage)
    if search:
        search_filter = f"%{search}%"
        stmt = stmt.where(
            col(Contact.first_name).ilike(search_filter)
            | col(Contact.last_name).ilike(search_filter)
            | col(Contact.nickname).ilike(search_filter)
            | col(Contact.company).ilike(search_filter)
        )
    if tag_id:
        stmt = stmt.join(ContactTag).where(ContactTag.tag_id == tag_id)
    if group_id:
        stmt = stmt.join(ContactGroup).where(ContactGroup.group_id == group_id)

    stmt = stmt.options(
        selectinload(Contact.tags),
        selectinload(Contact.groups),
        selectinload(Contact.fields),
    ).limit(limit)

    contacts = session.exec(stmt).all()

    # Build CSV content
    output = StringIO()
    writer = csv.writer(output)

    # Write header
    writer.writerow(
        [
            "id",
            "first_name",
            "middle_name",
            "last_name",
            "nickname",
            "prefix",
            "suffix",
            "company",
            "title",
            "department",
            "email",
            "phone",
            "birthday",
            "how_we_met",
            "is_favorite",
            "is_archived",
            "stage",
            "contact_frequency_days",
            "tags",
            "groups",
            "created_at",
            "last_contacted_at",
        ]
    )

    for contact in contacts:
        # Get primary email and phone
        primary_email = next(
            (
                f.value
                for f in contact.fields
                if f.field_type == "email" and f.is_primary
            ),
            next((f.value for f in contact.fields if f.field_type == "email"), ""),
        )
        primary_phone = next(
            (
                f.value
                for f in contact.fields
                if f.field_type == "phone" and f.is_primary
            ),
            next((f.value for f in contact.fields if f.field_type == "phone"), ""),
        )

        writer.writerow(
            [
                str(contact.id),
                contact.first_name,
                contact.middle_name or "",
                contact.last_name or "",
                contact.nickname or "",
                contact.prefix or "",
                contact.suffix or "",
                contact.company or "",
                contact.title or "",
                contact.department or "",
                primary_email,
                primary_phone,
                str(contact.birthday) if contact.birthday else "",
                contact.how_we_met or "",
                contact.is_favorite,
                contact.is_archived,
                contact.stage or "",
                contact.contact_frequency_days or "",
                ", ".join(t.name for t in contact.tags) if contact.tags else "",
                ", ".join(g.name for g in contact.groups) if contact.groups else "",
                contact.created_at.isoformat() if contact.created_at else "",
                contact.last_contacted_at.isoformat()
                if contact.last_contacted_at
                else "",
            ]
        )

    csv_content = output.getvalue()
    output.close()

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=contacts.csv"},
    )


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
) -> CSVPreviewResponse:
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
) -> CSVImportResponse:
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
) -> Response:
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
