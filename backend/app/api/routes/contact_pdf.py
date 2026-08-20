"""PDF generation for contact one-pager using WeasyPrint."""

from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, Response
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.crud import visible_contact_ids
from app.models import (
    Contact,
    ContactField,
    ContactPublic,
    Debt,
    DebtDirection,
    Gift,
    GiftStatus,
    Interaction,
    InteractionAttendee,
    Relationship,
)

router = APIRouter(prefix="/contacts", tags=["contacts"])


def _format_date(value: date | datetime | str | None) -> str:
    """Return a human-readable date string."""
    if value is None:
        return ""
    if isinstance(value, str):
        try:
            value = date.fromisoformat(value[:10])
        except ValueError:
            return value[:10]
    if isinstance(value, datetime):
        value = value.date()
    if value.year <= 4 or value.year < 1900:
        return value.strftime("%b %d")
    return value.strftime("%b %d, %Y")


def _format_datetime(value: datetime | None) -> str:
    """Return a human-readable datetime string."""
    if value is None:
        return ""
    return value.strftime("%b %d, %Y %I:%M %p")


def _build_contact_one_pager_html(contact: ContactPublic, data: dict) -> str:
    """Build the HTML content for the contact one-pager."""

    # Build full name
    name_parts = [
        contact.prefix or "",
        contact.first_name,
        contact.middle_name or "",
        contact.last_name or "",
        contact.suffix or "",
    ]
    full_name = " ".join(p for p in name_parts if p)

    # Avatar handling
    avatar_html = ""
    if contact.avatar_url:
        avatar_html = (
            f'<img class="avatar" src="{contact.avatar_url}" alt="{full_name}" />'
        )
    else:
        # Generate initials avatar
        initials = ""
        if contact.first_name:
            initials += contact.first_name[0].upper()
        if contact.last_name:
            initials += contact.last_name[0].upper()
        avatar_html = f'<div class="avatar avatar-initials">{initials}</div>'

    # Contact fields
    contact_fields_html = ""
    if data.get("contact_fields"):
        fields = data["contact_fields"]
        # Group by type
        emails = [f for f in fields if f.field_type == "email"]
        phones = [f for f in fields if f.field_type == "phone"]

        if emails:
            contact_fields_html += '<div class="section"><h3>Email</h3>'
            for f in emails:
                contact_fields_html += f'<div class="field-row"><span class="label">{f.label}:</span> {f.value}</div>'
            contact_fields_html += "</div>"

        if phones:
            contact_fields_html += '<div class="section"><h3>Phone</h3>'
            for f in phones:
                contact_fields_html += f'<div class="field-row"><span class="label">{f.label}:</span> {f.value}</div>'
            contact_fields_html += "</div>"

    # Addresses
    addresses_html = ""
    if data.get("addresses"):
        addresses_html = '<div class="section"><h3>Addresses</h3>'
        for addr in data["addresses"]:
            addr_parts = []
            if addr.street:
                addr_parts.append(addr.street)
            if addr.extended:
                addr_parts.append(addr.extended)
            city_region = []
            if addr.city:
                city_region.append(addr.city)
            if addr.region:
                city_region.append(addr.region)
            if city_region:
                addr_parts.append(", ".join(city_region))
            if addr.postal_code:
                addr_parts.append(addr.postal_code)
            if addr.country:
                addr_parts.append(addr.country)
            addresses_html += f'<div class="address">{addr.label}:<br/>{"<br/>".join(addr_parts)}</div>'
        addresses_html += "</div>"

    # Last 5 interactions
    interactions_html = ""
    if data.get("interactions"):
        interactions_html = (
            '<div class="section"><h3>Recent Interactions</h3><ul class="timeline">'
        )
        for ix in data["interactions"][:5]:
            channel = ix.channel.replace("_", " ").title() if ix.channel else ""
            occurred = _format_datetime(ix.occurred_at)
            notes = (
                ix.notes[:200] + "..."
                if ix.notes and len(ix.notes) > 200
                else (ix.notes or "")
            )
            interactions_html += f"""
            <li class="timeline-item">
                <div class="timeline-date">{occurred}</div>
                <div class="timeline-content">
                    <strong>{channel}</strong>
                    {f'<p class="notes">{notes}</p>' if notes else ""}
                </div>
            </li>"""
        interactions_html += "</ul></div>"

    # Debts
    debts_html = ""
    if data.get("debts"):
        active_debts = [d for d in data["debts"] if not d.is_settled]
        if active_debts:
            debts_html = '<div class="section"><h3>Active Debts</h3><ul>'
            for d in active_debts:
                direction = (
                    "They owe me"
                    if d.direction == DebtDirection.THEY_OWE
                    else "I owe them"
                )
                reason = f" - {d.reason}" if d.reason else ""
                debts_html += f"<li>${d.amount:.2f} ({direction}){reason}</li>"
            debts_html += "</ul></div>"

    # Gifts
    gifts_html = ""
    if data.get("gifts"):
        active_gifts = [g for g in data["gifts"] if g.status != GiftStatus.IDEA]
        if active_gifts:
            gifts_html = '<div class="section"><h3>Gifts Given/Received</h3><ul>'
            for g in active_gifts[:5]:
                status_label = g.status.replace("_", " ").title()
                value = f" - ${g.value_amount:.2f}" if g.value_amount else ""
                gifts_html += f"<li>{g.name} ({status_label}){value}</li>"
            gifts_html += "</ul></div>"

    # Relationships
    relationships_html = ""
    if data.get("relationships"):
        relationships_html = '<div class="section"><h3>Relationships</h3><ul>'
        for rel in data["relationships"]:
            # Get the related contact name
            related_name = rel.related_contact_name or "Unknown"
            relationships_html += (
                f"<li>{rel.relationship_type.title()}: {related_name}</li>"
            )
        relationships_html += "</ul></div>"

    # Tags
    tags_html = ""
    if contact.tags:
        tags_html = '<div class="section"><h3>Tags</h3><div class="tags">'
        for tag in contact.tags:
            color = tag.color or "#6b7280"
            tags_html += f'<span class="tag" style="background-color: {color}20; color: {color}; border: 1px solid {color}40;">{tag.name}</span>'
        tags_html += "</div></div>"

    # Notes summary
    notes_html = ""
    if data.get("notes"):
        notes_html = '<div class="section"><h3>Recent Notes</h3>'
        for note in data["notes"][:3]:
            body = note.body[:150] + "..." if len(note.body) > 150 else note.body
            created = _format_datetime(note.created_at)
            notes_html += (
                f'<div class="note"><p>{body}</p><small>{created}</small></div>'
            )
        notes_html += "</div>"

    # Company/Title
    company_title = ""
    if contact.company or contact.title:
        parts = []
        if contact.title:
            parts.append(contact.title)
        if contact.company:
            parts.append(f"at {contact.company}")
        company_title = f'<div class="company-title">{" ".join(parts)}</div>'

    # Birthday
    birthday_html = ""
    if contact.birthday:
        birthday_html = f'<div class="detail-item"><strong>Birthday:</strong> {_format_date(contact.birthday)}</div>'

    # How we met
    how_met_html = ""
    if contact.how_we_met:
        how_met_html = (
            f'<div class="section"><h3>How We Met</h3><p>{contact.how_we_met}</p></div>'
        )

    html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page {{
            size: A4;
            margin: 15mm;
        }}

        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}

        body {{
            font-family: 'Helvetica Neue', Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.5;
            color: #333;
        }}

        .page {{
            max-width: 210mm;
        }}

        .header {{
            display: flex;
            align-items: flex-start;
            gap: 20px;
            margin-bottom: 25px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e5e7eb;
        }}

        .avatar {{
            width: 80px;
            height: 80px;
            border-radius: 50%;
            object-fit: cover;
        }}

        .avatar-initials {{
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background-color: #6366f1;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28pt;
            font-weight: bold;
        }}

        .header-info {{
            flex: 1;
        }}

        h1 {{
            font-size: 24pt;
            font-weight: 700;
            margin-bottom: 5px;
            color: #111;
        }}

        .company-title {{
            font-size: 12pt;
            color: #666;
            margin-bottom: 10px;
        }}

        .details-grid {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 15px;
        }}

        .detail-item {{
            font-size: 10pt;
        }}

        .detail-item strong {{
            color: #555;
        }}

        .section {{
            margin-bottom: 20px;
            page-break-inside: avoid;
        }}

        .section h3 {{
            font-size: 13pt;
            font-weight: 600;
            color: #374151;
            margin-bottom: 10px;
            padding-bottom: 5px;
            border-bottom: 1px solid #e5e7eb;
        }}

        .field-row {{
            margin-bottom: 5px;
            font-size: 10pt;
        }}

        .field-row .label {{
            color: #6b7280;
            font-size: 9pt;
        }}

        .address {{
            margin-bottom: 10px;
            font-size: 10pt;
        }}

        .tags {{
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
        }}

        .tag {{
            display: inline-block;
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 9pt;
        }}

        .timeline {{
            list-style: none;
        }}

        .timeline-item {{
            margin-bottom: 10px;
            padding-left: 15px;
            border-left: 2px solid #e5e7eb;
        }}

        .timeline-date {{
            font-size: 9pt;
            color: #6b7280;
            margin-bottom: 3px;
        }}

        .timeline-content {{
            font-size: 10pt;
        }}

        .notes {{
            margin-top: 5px;
            color: #555;
            font-size: 9pt;
        }}

        ul {{
            margin-left: 20px;
            font-size: 10pt;
        }}

        li {{
            margin-bottom: 5px;
        }}

        .note {{
            margin-bottom: 10px;
            padding: 8px;
            background-color: #f9fafb;
            border-radius: 4px;
            font-size: 10pt;
        }}

        .note small {{
            color: #9ca3af;
            font-size: 8pt;
        }}

        .footer {{
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #e5e7eb;
            font-size: 8pt;
            color: #9ca3af;
            text-align: center;
        }}

        @media print {{
            .page-break {{
                page-break-before: always;
            }}
        }}
    </style>
</head>
<body>
    <div class="page">
        <div class="header">
            {avatar_html}
            <div class="header-info">
                <h1>{full_name}</h1>
                {company_title}
                <div class="details-grid">
                    {f'<div class="detail-item"><strong>Nickname:</strong> {contact.nickname}</div>' if contact.nickname else ""}
                    {birthday_html}
                    {f'<div class="detail-item"><strong>Last Contacted:</strong> {_format_datetime(contact.last_contacted_at)}</div>' if contact.last_contacted_at else ""}
                    {f'<div class="detail-item"><strong>Contact Frequency:</strong> Every {contact.contact_frequency_days} days</div>' if contact.contact_frequency_days else ""}
                </div>
            </div>
        </div>

        {contact_fields_html}
        {addresses_html}
        {how_met_html}
        {tags_html}
        {relationships_html}
        {interactions_html}
        {debts_html}
        {gifts_html}
        {notes_html}

        <div class="footer">
            Generated on {_format_datetime(datetime.now(timezone.utc))} | Personal CRM
        </div>
    </div>
</body>
</html>"""
    return html


@router.get("/{contact_id}.pdf")
async def get_contact_pdf(
    session: SessionDep,
    current_user: CurrentUser,
    contact_id: uuid.UUID,
) -> Any:
    """Generate a printable PDF one-pager for a contact."""
    try:
        from weasyprint import HTML
    except ImportError:
        raise HTTPException(
            status_code=501,
            detail="PDF generation not available (WeasyPrint not installed)",
        )

    # Fetch contact with visibility check
    visible_ids = visible_contact_ids(current_user)
    statement = (
        select(Contact)
        .where(
            Contact.id == contact_id,
            Contact.id.in_(visible_ids),
        )
        .options(
            select(Contact.tags),
            select(Contact.groups),
        )
    )
    contact = session.exec(statement).first()

    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    # Build ContactPublic for template
    contact_public = ContactPublic.model_validate(contact)

    # Fetch related data
    data: dict[str, Any] = {}

    # Contact fields
    contact_fields = session.exec(
        select(ContactField).where(ContactField.contact_id == contact_id)
    ).all()
    data["contact_fields"] = contact_fields

    # Addresses
    from app.models import Address

    addresses = session.exec(
        select(Address).where(Address.contact_id == contact_id)
    ).all()
    data["addresses"] = addresses

    # Last 5 interactions
    interactions = session.exec(
        select(Interaction)
        .join(InteractionAttendee, InteractionAttendee.interaction_id == Interaction.id)
        .where(InteractionAttendee.contact_id == contact_id)
        .order_by(Interaction.occurred_at.desc())
        .limit(5)
    ).all()
    data["interactions"] = interactions

    # Debts
    debts = session.exec(select(Debt).where(Debt.contact_id == contact_id)).all()
    data["debts"] = debts

    # Gifts
    gifts = session.exec(select(Gift).where(Gift.contact_id == contact_id)).all()
    data["gifts"] = gifts

    # Relationships with related contact names
    relationships = session.exec(
        select(Relationship).where(Relationship.contact_id == contact_id)
    ).all()

    # Enrich relationships with related contact names
    rel_list = []
    for rel in relationships:
        rel_dict = {
            "relationship_type": rel.relationship_type,
            "related_contact_name": None,
        }
        related = session.get(Contact, rel.related_contact_id)
        if related and related.id in visible_ids:
            rel_dict["related_contact_name"] = (
                f"{related.first_name} {related.last_name or ''}".strip()
            )
        rel_list.append(type("Rel", (), rel_dict)())
    data["relationships"] = rel_list

    # Notes
    from app.models import Note

    notes = session.exec(
        select(Note)
        .where(Note.contact_id == contact_id)
        .order_by(Note.created_at.desc())
        .limit(5)
    ).all()
    data["notes"] = notes

    # Generate HTML
    html_content = _build_contact_one_pager_html(contact_public, data)

    # Generate PDF
    pdf_bytes = HTML(string=html_content).write_pdf()

    # Return as streaming response
    filename = f"{contact.first_name}_{contact.last_name or 'contact'}_one_pager.pdf"
    filename = filename.replace(" ", "_").lower()

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={filename}"},
    )
