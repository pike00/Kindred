"""Journal entry management routes."""

import uuid

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.crud import create_journal_entry
from app.models import (
    JournalEntriesPublic,
    JournalEntry,
    JournalEntryCreate,
    JournalEntryPublic,
    JournalEntryUpdate,
    Ok,
)

router = APIRouter(prefix="/journal", tags=["journal"])


@router.get("/", response_model=JournalEntriesPublic)
def list_journal_entries(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> JournalEntriesPublic:
    """List journal entries for the current user."""
    statement = (
        select(JournalEntry)
        .where(JournalEntry.owner_id == current_user.id)
        .order_by(JournalEntry.entry_date.desc())
        .offset(skip)
        .limit(limit)
    )
    entries = session.exec(statement).all()

    count_statement = select(func.count(JournalEntry.id)).where(
        JournalEntry.owner_id == current_user.id
    )
    count = session.exec(count_statement).one()

    return JournalEntriesPublic(
        data=[JournalEntryPublic.model_validate(e) for e in entries],
        count=count,
    )


@router.post("/", response_model=JournalEntryPublic)
def create_journal_entry_route(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    entry_in: JournalEntryCreate,
) -> JournalEntryPublic:
    """Create a new journal entry."""
    entry = create_journal_entry(
        session=session, journal_in=entry_in, owner_id=current_user.id
    )
    return JournalEntryPublic.model_validate(entry)


@router.patch("/{entry_id}", response_model=JournalEntryPublic)
def update_journal_entry(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    entry_id: uuid.UUID,
    entry_in: JournalEntryUpdate,
) -> JournalEntryPublic:
    """Update a journal entry."""
    entry = session.get(JournalEntry, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    if entry.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    update_data = entry_in.model_dump(exclude_unset=True)
    entry.sqlmodel_update(update_data)
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return JournalEntryPublic.model_validate(entry)


@router.delete("/{entry_id}", response_model=Ok)
def delete_journal_entry(
    session: SessionDep,
    current_user: CurrentUser,
    entry_id: uuid.UUID,
) -> Ok:
    """Delete a journal entry."""
    entry = session.get(JournalEntry, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    if entry.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    session.delete(entry)
    session.commit()
    return Ok()
