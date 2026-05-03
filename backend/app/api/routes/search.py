"""Global full-text search endpoint using PostgreSQL tsvector."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, SQLModel, func, or_, select

from app.api.deps import get_current_user, get_db
from app.models import (
    Contact,
    ContactTag,
    Interaction,
    JournalEntry,
    Note,
    TagShare,
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


class SearchResponse(SQLModel):
    """Search results grouped by type with total counts."""

    results: list[SearchResultItem]
    total: int
    query: str


# ─── Helpers ────────────────────────────────────────────────────────────


def _get_shared_contact_ids(session: Session, user_id: str) -> list[str]:
    """Return contact IDs the user can see via TagShare grants."""
    stmt = (
        select(ContactTag.contact_id)
        .join(TagShare, TagShare.tag_id == ContactTag.tag_id)
        .where(TagShare.grantee_id == user_id)
        .distinct()
    )
    return [str(row[0]) for row in session.exec(stmt)]


def _search_contacts(
    session: Session,
    query: str,
    owner_id: str,
    shared_contact_ids: list[str],
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
            or_(
                Contact.owner_id == owner_id,
                Contact.id.in_(shared_contact_ids),  # type: ignore[arg-type]
            ),
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
    owner_id: str,
    shared_contact_ids: list[str],
    limit: int,
) -> list[dict]:
    """Search Note table using tsvector."""
    ts_query = func.plainto_tsquery("english", query)
    # Notes are scoped to owner, or to a contact the user can see via TagShare
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
            or_(
                Note.owner_id == owner_id,
                Note.contact_id.in_(shared_contact_ids),  # type: ignore[arg-type]
            ),
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
    owner_id: str,
    shared_contact_ids: list[str],
    limit: int,
) -> list[dict]:
    """Search Interaction table using tsvector."""
    ts_query = func.plainto_tsquery("english", query)
    stmt = (
        select(
            Interaction.id,
            Interaction.notes,
            Interaction.occurred_at,
            Interaction.created_at,
            Interaction.updated_at,
            func.ts_rank(Interaction.search_vector, ts_query).label("rank"),
        )
        .where(
            Interaction.search_vector.op("@@")(ts_query),
            or_(
                Interaction.owner_id == owner_id,
                Interaction.contact_id.in_(shared_contact_ids),  # type: ignore[arg-type]
            ),
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
                "updated_at": row.updated_at.isoformat() if row.updated_at else None,
            }
        )
    return results


def _search_journal_entries(
    session: Session,
    query: str,
    owner_id: str,
    limit: int,
) -> list[dict]:
    """Search JournalEntry table using tsvector (owner-scoped only, no TagShare)."""
    ts_query = func.plainto_tsquery("english", query)
    stmt = (
        select(
            JournalEntry.id,
            JournalEntry.body,
            JournalEntry.entry_date,
            JournalEntry.created_at,
            JournalEntry.updated_at,
            func.ts_rank(JournalEntry.search_vector, ts_query).label("rank"),
        )
        .where(
            JournalEntry.search_vector.op("@@")(ts_query),
            JournalEntry.owner_id == owner_id,
        )
        .order_by(func.ts_rank(JournalEntry.search_vector, ts_query).desc())
        .limit(limit)
    )
    rows = session.exec(stmt).all()
    results = []
    for row in rows:
        snippet = (row.body[:120] + "...") if len(row.body) > 120 else row.body
        title = f"Journal entry: {row.entry_date}"
        results.append(
            {
                "id": str(row.id),
                "type": "journal_entry",
                "title": title,
                "snippet": snippet,
                "rank": float(row.rank) if row.rank else None,
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "updated_at": row.updated_at.isoformat() if row.updated_at else None,
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
    owner_id = str(current_user.id)
    shared_contact_ids = _get_shared_contact_ids(session, owner_id)

    # Run searches in parallel (they're independent)
    contacts = _search_contacts(session, q, owner_id, shared_contact_ids, limit)
    notes = _search_notes(session, q, owner_id, shared_contact_ids, limit)
    interactions = _search_interactions(session, q, owner_id, shared_contact_ids, limit)
    journal_entries = _search_journal_entries(session, q, owner_id, limit)

    # Merge and sort by rank (descending), then by type for stable ordering
    all_results = contacts + notes + interactions + journal_entries
    all_results.sort(key=lambda r: (-(r["rank"] or 0), r["type"]))

    return SearchResponse(
        results=[SearchResultItem(**r) for r in all_results],
        total=len(all_results),
        query=q,
    )
