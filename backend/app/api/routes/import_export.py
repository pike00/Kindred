"""Import and export routes for vCard and CSV files."""

from typing import Any
import uuid

from fastapi import APIRouter, File, UploadFile
from fastapi.responses import Response
from sqlmodel import select, col

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Address,
    Contact,
    ContactField,
    ContactFieldType,
    ContactTag,
    ContactGroup,
)
from app.vcard import contact_to_vcard, vcard_to_contact_data
from app.crud import visible_contact_ids

router = APIRouter(prefix="/import-export", tags=["import-export"])


@router.post("/import/vcard")
async def import_vcard(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    file: UploadFile = File(...),
) -> Any:
    """Import contacts from a .vcf file (supports multiple vCards in one file)."""
    content = await file.read()
    text = content.decode("utf-8", errors="replace")

    imported = 0
    errors = []

    for card_text in _split_vcards(text):
        try:
            parsed = vcard_to_contact_data(card_text)
            contact_data = parsed["contact"]

            contact = Contact(
                owner_id=current_user.id,
                vcard_raw=parsed["vcard_raw"],
                **contact_data,
            )
            if parsed.get("uid"):
                # Check if contact with this UID already exists
                existing = session.get(Contact, parsed["uid"])
                if existing and existing.owner_id == current_user.id:
                    errors.append(
                        f"Skipped duplicate: {contact_data.get('first_name', '')} {contact_data.get('last_name', '')}"
                    )
                    continue
                contact.id = parsed["uid"]

            session.add(contact)
            session.commit()
            session.refresh(contact)

            # Create contact fields
            for field_data in parsed["fields"]:
                cf = ContactField(
                    contact_id=contact.id,
                    field_type=ContactFieldType(field_data["field_type"]),
                    label=field_data.get("label", "other"),
                    value=field_data["value"],
                    is_primary=field_data.get("is_primary", False),
                )
                session.add(cf)

            # Create addresses
            for addr_data in parsed["addresses"]:
                addr = Address(contact_id=contact.id, **addr_data)
                session.add(addr)

            session.commit()
            imported += 1

        except Exception as e:
            errors.append(str(e))

    return {
        "imported": imported,
        "errors": errors,
    }


@router.get("/export/vcard")
def export_vcard(
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
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


@router.get("/export/json")
def export_json(
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """Export all data as JSON."""
    # This will be expanded as more models are added
    contacts = session.exec(
        select(Contact).where(Contact.owner_id == current_user.id)
    ).all()
    return {"contacts": [c.model_dump() for c in contacts]}


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
    from io import StringIO
    import csv

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
    writer.writerow([
        "id", "first_name", "middle_name", "last_name", "nickname",
        "prefix", "suffix", "company", "title", "department",
        "email", "phone", "birthday", "how_we_met",
        "is_favorite", "is_archived", "stage", "contact_frequency_days",
        "tags", "groups", "created_at", "last_contacted_at",
    ])

    for contact in contacts:
        # Get primary email and phone
        primary_email = next(
            (f.value for f in contact.fields if f.field_type == "email" and f.is_primary),
            next((f.value for f in contact.fields if f.field_type == "email"), ""),
        )
        primary_phone = next(
            (f.value for f in contact.fields if f.field_type == "phone" and f.is_primary),
            next((f.value for f in contact.fields if f.field_type == "phone"), ""),
        )

        writer.writerow([
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
            contact.last_contacted_at.isoformat() if contact.last_contacted_at else "",
        ])

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
