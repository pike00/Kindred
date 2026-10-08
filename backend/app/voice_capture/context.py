from __future__ import annotations

import uuid
from datetime import date
from typing import Any

from rapidfuzz import fuzz
from sqlmodel import Session, select

from app.crud import visible_contact_ids
from app.models import Contact, Relationship

_MAX_CANDIDATES = 20
_FIELDS = (
    "company",
    "department",
    "title",
    "nickname",
    "pronouns",
    "birthday",
    "how_we_met",
)


def candidate_context(
    session: Session, user: Any, text: str
) -> tuple[list[dict], set[uuid.UUID]]:
    """Return bounded fuzzy name matches and visible edges only."""
    contacts = session.exec(
        select(Contact).where(Contact.id.in_(visible_contact_ids(user)))
    ).all()
    scored: list[tuple[int, Contact]] = []
    lowered = text.casefold()
    for contact in contacts:
        names = [" ".join(p for p in (contact.first_name, contact.last_name) if p)]
        if contact.first_name:
            names.append(contact.first_name)
        if contact.nickname:
            names.append(contact.nickname)
        score = max(
            (fuzz.partial_ratio(name.casefold(), lowered) for name in names if name),
            default=0,
        )
        if score >= 72:
            scored.append((score, contact))
    candidates = [
        c
        for _, c in sorted(scored, key=lambda pair: pair[0], reverse=True)[
            :_MAX_CANDIDATES
        ]
    ]
    ids = {c.id for c in candidates}
    edges: list[dict[str, str]] = []
    if ids:
        rows = session.exec(
            select(Relationship).where(
                Relationship.contact_id.in_(ids)
                | Relationship.related_contact_id.in_(ids)
            )
        ).all()
        for edge in rows:
            if edge.contact_id in ids and edge.related_contact_id in ids:
                edges.append(
                    {
                        "from": str(edge.contact_id),
                        "to": str(edge.related_contact_id),
                        "type": edge.relationship_type,
                    }
                )
    result = []
    for contact in candidates:
        values = {name: getattr(contact, name) for name in _FIELDS}
        if isinstance(values.get("birthday"), date):
            values["birthday"] = values["birthday"].isoformat()
        result.append(
            {
                "id": str(contact.id),
                "name": " ".join(
                    p for p in (contact.first_name, contact.last_name) if p
                ),
                "current_fields": values,
            }
        )
    return [{"contacts": result, "relationships": edges}], ids
