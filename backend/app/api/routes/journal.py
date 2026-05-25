"""Journal entry management routes."""

import uuid

from fastapi import APIRouter, HTTPException
from sqlmodel import delete as sql_delete
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.crud import create_journal_entry
from app.models import (
    JournalEntriesPublic,
    JournalEntry,
    JournalEntryContact,
    JournalEntryCreate,
    JournalEntryPublic,
    JournalEntryUpdate,
    Ok,
)

router = APIRouter(prefix="/journal", tags=["journal"])


def _to_public(session: SessionDep, entry: JournalEntry) -> JournalEntryPublic:
    """Serialize a journal entry with its linked contact IDs.

    ``contact_ids`` lives only on ``JournalEntryPublic`` (the table model has no
    such column), so it is supplied at validation time rather than assigned onto
    the ORM object.
    """
    contact_ids = list(
        session.exec(
            select(JournalEntryContact.contact_id).where(
                JournalEntryContact.journal_entry_id == entry.id
            )
        ).all()
    )
    return JournalEntryPublic.model_validate(entry, update={"contact_ids": contact_ids})


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
    # Load contact IDs for each entry
    for entry in entries:
        contact_ids_stmt = select(JournalEntryContact.contact_id).where(
            JournalEntryContact.journal_entry_id == entry.id
        )
        entry.contact_ids = list(session.exec(contact_ids_stmt).all())

    count_statement = select(func.count(JournalEntry.id)).where(
        JournalEntry.owner_id == current_user.id
    )
    count = session.exec(count_statement).one()

    return JournalEntriesPublic(
        data=[_to_public(session, e) for e in entries],
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
    # Load contact IDs for response
    contact_ids_stmt = select(JournalEntryContact.contact_id).where(
        JournalEntryContact.journal_entry_id == entry.id
    )
    entry.contact_ids = list(session.exec(contact_ids_stmt).all())
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
    # contact_ids is not a column on JournalEntry; handle it via the junction
    # table separately and keep it out of the ORM update.
    has_contact_ids = "contact_ids" in update_data
    new_contact_ids = update_data.pop("contact_ids", None)
    entry.sqlmodel_update(update_data)
    session.add(entry)
    session.commit()
    session.refresh(entry)
    # Sync contact associations if provided
    if "contact_ids" in update_data:
        # Remove existing associations
        session.exec(
            sql_delete(JournalEntryContact).where(
                JournalEntryContact.journal_entry_id == entry.id
            )
        )
        # Add new associations
        if update_data.get("contact_ids"):
            for cid in set(update_data["contact_ids"]):
                session.add(
                    JournalEntryContact(journal_entry_id=entry.id, contact_id=cid)
                )
        session.flush()
        session.refresh(entry)
    # Load contact IDs for response
    contact_ids_stmt = select(JournalEntryContact.contact_id).where(
        JournalEntryContact.journal_entry_id == entry.id
    )
    entry.contact_ids = list(session.exec(contact_ids_stmt).all())
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
