"""Global full-text search endpoint using PostgreSQL tsvector."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, SQLModel, func, select

from app.api.deps import get_current_user, get_db
from app.crud import visible_contact_ids
from app.models import (
    Contact,
    Interaction,
    InteractionAttendee,
    Note,
    User,
)

router = APIRouter(prefix="/search", tags=["search"])


# ─── Response models ────────────────────────────────────────────────────


class SearchResultItem(SQLModel):
    """A single search result with type discriminator and ranking info."""

    id: str
    type: str  # "contact" | "note" | "interaction" | "journal_entry"
    title: str
    snippet: str | None = None
    rank: float | None = None
    created_at: str | None = None
    updated_at: str | None = None
    contact_id: str | None = None


class SearchResponse(SQLModel):
    """Search results grouped by type with total counts."""

    results: list[SearchResultItem]
    total: int
    query: str


# ─── Helpers ────────────────────────────────────────────────────────────


def _search_contacts(
    session: Session,
    query: str,
    visible_ids: object,
    limit: int,
) -> list[dict]:
    """Search Contact table using tsvector."""
    ts_query = func.plainto_tsquery("english", query)
    stmt = (
        select(
            Contact.id,
            Contact.first_name,
            Contact.last_name,
            Contact.company,
            Contact.created_at,
            Contact.updated_at,
            func.ts_rank(Contact.search_vector, ts_query).label("rank"),
        )
        .where(
            Contact.search_vector.op("@@")(ts_query),
            Contact.deleted_at.is_(None),
            Contact.id.in_(visible_ids),  # type: ignore[arg-type]
        )
        .order_by(func.ts_rank(Contact.search_vector, ts_query).desc())
        .limit(limit)
    )
    rows = session.exec(stmt).all()
    results = []
    for row in rows:
        name_parts = [row.first_name]
        if row.last_name:
            name_parts.append(row.last_name)
        title = " ".join(name_parts)
        results.append(
            {
                "id": str(row.id),
                "type": "contact",
                "title": title,
                "snippet": row.company,
                "rank": float(row.rank) if row.rank else None,
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "updated_at": row.updated_at.isoformat() if row.updated_at else None,
            }
        )
    return results


def _search_notes(
    session: Session,
    query: str,
    visible_ids: object,
    limit: int,
    owner_id: uuid.UUID,
) -> list[dict]:
    """Search Note table using tsvector."""
    ts_query = func.plainto_tsquery("english", query)
    stmt = (
        select(
            Note.id,
            Note.body,
            Note.contact_id,
            Note.created_at,
            Note.updated_at,
            func.ts_rank(Note.search_vector, ts_query).label("rank"),
        )
        .where(
            Note.search_vector.op("@@")(ts_query),
            Note.deleted_at.is_(None),
            Note.owner_id == owner_id,
            Note.contact_id.in_(visible_ids),  # type: ignore[arg-type]
        )
        .order_by(func.ts_rank(Note.search_vector, ts_query).desc())
        .limit(limit)
    )
    rows = session.exec(stmt).all()
    results = []
    for row in rows:
        snippet = (row.body[:120] + "...") if len(row.body) > 120 else row.body
        results.append(
            {
                "id": str(row.id),
                "type": "note",
                "contact_id": str(row.contact_id),
                "title": f"Note on contact {row.contact_id}",
                "snippet": snippet,
                "rank": float(row.rank) if row.rank else None,
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "updated_at": row.updated_at.isoformat() if row.updated_at else None,
            }
        )
    return results


def _search_interactions(
    session: Session,
    query: str,
    visible_ids: object,
    limit: int,
) -> list[dict]:
    """Search Interaction table using tsvector."""
    ts_query = func.plainto_tsquery("english", query)
    # Interactions have no direct contact_id (attendees are many-to-many via
    # interaction_attendee) and no updated_at column.
    shared_interaction_ids = select(InteractionAttendee.interaction_id).where(
        InteractionAttendee.contact_id.in_(visible_ids)  # type: ignore[arg-type]
    )
    stmt = (
        select(
            Interaction.id,
            Interaction.notes,
            Interaction.occurred_at,
            Interaction.created_at,
            func.ts_rank(Interaction.search_vector, ts_query).label("rank"),
        )
        .where(
            Interaction.search_vector.op("@@")(ts_query),
            Interaction.deleted_at.is_(None),
            Interaction.id.in_(shared_interaction_ids),  # type: ignore[arg-type]
        )
        .order_by(func.ts_rank(Interaction.search_vector, ts_query).desc())
        .limit(limit)
    )
    rows = session.exec(stmt).all()
    results = []
    for row in rows:
        snippet = None
        if row.notes:
            snippet = (row.notes[:120] + "...") if len(row.notes) > 120 else row.notes
        title = f"Interaction on {row.occurred_at.date() if row.occurred_at else 'unknown date'}"
        results.append(
            {
                "id": str(row.id),
                "type": "interaction",
                "title": title,
                "snippet": snippet,
                "rank": float(row.rank) if row.rank else None,
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "updated_at": None,
            }
        )
    return results


# ─── Endpoint ──────────────────────────────────────────────────────────


@router.get("", response_model=SearchResponse)
def search(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(20, ge=1, le=100, description="Max results per type"),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_db),
) -> SearchResponse:
    """Full-text search across contacts, notes, interactions, and journal entries.

    Results are scoped to the authenticated user (owner) or contacts shared
    via TagShare grants. Journal entries are owner-only (not contact-scoped).
    """
    visible_ids = visible_contact_ids(current_user)

    # Run searches in parallel (they're independent)
    contacts = _search_contacts(session, q, visible_ids, limit)
    notes = _search_notes(session, q, visible_ids, limit, current_user.id)
    interactions = _search_interactions(session, q, visible_ids, limit)

    # Merge and sort by rank (descending), then by type for stable ordering
    all_results = contacts + notes + interactions
    all_results.sort(key=lambda r: (-(r["rank"] or 0), r["type"]))

    return SearchResponse(
        results=[SearchResultItem(**r) for r in all_results],
        total=len(all_results),
        query=q,
    )
