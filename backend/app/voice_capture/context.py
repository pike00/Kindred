from __future__ import annotations

import re
import uuid
from datetime import date
from typing import Any

from rapidfuzz import fuzz
from sqlmodel import Session, select

from app.crud import visible_contact_ids
from app.models import Contact, Relationship

_MAX_CANDIDATES = 20
_MAX_RELATIONSHIPS = 40
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
    visible_ids = {contact.id for contact in contacts}
    contacts_by_id = {contact.id: contact for contact in contacts}
    text_tokens = re.findall(r"\w+", text.casefold())
    scored: list[tuple[bool, int, int, str, str, Contact]] = []
    lowered = text.casefold()
    for contact in contacts:
        full_name = " ".join(p for p in (contact.first_name, contact.last_name) if p)
        full_tokens = re.findall(r"\w+", full_name.casefold())
        windows = (
            [
                text_tokens[index : index + len(full_tokens)]
                for index in range(max(0, len(text_tokens) - len(full_tokens) + 1))
            ]
            if full_tokens
            else []
        )
        exact_full_name = len(full_tokens) > 1 and full_tokens in windows
        full_name_score = max(
            (fuzz.ratio(" ".join(full_tokens), " ".join(window)) for window in windows),
            default=0,
        )
        other_names = [name for name in (contact.first_name, contact.nickname) if name]
        other_name_score = max(
            (fuzz.partial_ratio(name.casefold(), lowered) for name in other_names),
            default=0,
        )
        score = max(full_name_score, other_name_score)
        if score >= 72:
            scored.append(
                (
                    exact_full_name,
                    full_name_score,
                    other_name_score,
                    full_name.casefold(),
                    str(contact.id),
                    contact,
                )
            )
    candidates = [
        row[-1]
        for row in sorted(
            scored,
            key=lambda row: (
                not row[0],
                -row[1],
                -row[2],
                row[3],
                row[4],
            ),
        )[:_MAX_CANDIDATES]
    ]
    action_ids = {c.id for c in candidates}
    context_ids = set(action_ids)
    owned_candidate_ids = {c.id for c in candidates if c.owner_id == user.id}
    edges: list[dict[str, str]] = []
    if owned_candidate_ids:
        rows = session.exec(
            select(Relationship)
            .where(
                Relationship.contact_id.in_(owned_candidate_ids),
                Relationship.related_contact_id.in_(visible_ids),
            )
            .order_by(
                Relationship.contact_id,
                Relationship.related_contact_id,
                Relationship.relationship_type,
            )
            .limit(_MAX_RELATIONSHIPS)
        ).all()
        for edge in rows:
            if (
                edge.related_contact_id not in context_ids
                and len(candidates) < _MAX_CANDIDATES
            ):
                neighbor = contacts_by_id.get(edge.related_contact_id)
                if neighbor is not None:
                    candidates.append(neighbor)
                    context_ids.add(neighbor.id)
        for edge in rows:
            if edge.related_contact_id in context_ids:
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
    return [{"contacts": result, "relationships": edges}], action_ids
