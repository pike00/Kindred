"""Import and export routes for vCard and CSV files."""

from typing import Any

from fastapi import APIRouter, File, UploadFile
from fastapi.responses import Response
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Address,
    Contact,
    ContactField,
    ContactFieldType,
)
from app.vcard import contact_to_vcard, vcard_to_contact_data

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
