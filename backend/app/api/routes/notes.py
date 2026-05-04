"""Note management routes."""

import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, or_, select

from app.api.deps import CurrentUser, SessionDep
from app.crud import create_note, update_note
from app.models import (
    Contact,
    Note,
    NoteCreate,
    NoteMention,
    NotePublic,
    NotesPublic,
    NoteUpdate,
)

router = APIRouter(prefix="/notes", tags=["notes"])


@router.get("/contact/{contact_id}", response_model=NotesPublic)
def list_notes(
    session: SessionDep,
    current_user: CurrentUser,
    contact_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """List notes for a contact."""
    contact = session.get(Contact, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    if contact.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    # Notes authored on this contact's page UNION notes that @-mention this
    # contact via note_mention. Self-mentions (notes whose contact_id already
    # matches) are deduped by the OR condition's exclusive arms.
    mention_subq = select(NoteMention.note_id).where(
        NoteMention.contact_id == contact_id
    )
    where_clause = or_(
        Note.contact_id == contact_id,
        Note.id.in_(mention_subq),
    )

    statement = (
        select(Note)
        .where(where_clause)
        .order_by(Note.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    notes = session.exec(statement).all()

    count_statement = select(func.count(Note.id.distinct())).where(where_clause)
    count = session.exec(count_statement).one()

    return NotesPublic(
        data=[NotePublic.model_validate(n) for n in notes],
        count=count,
    )


@router.post("/", response_model=NotePublic)
def create_note_route(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    note_in: NoteCreate,
) -> Any:
    """Create a new note."""
    contact = session.get(Contact, note_in.contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    if contact.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    note = create_note(session=session, note_in=note_in, owner_id=current_user.id)
    return NotePublic.model_validate(note)


@router.patch("/{note_id}", response_model=NotePublic)
def update_note_route(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    note_id: uuid.UUID,
    note_in: NoteUpdate,
) -> Any:
    """Update a note."""
    note = session.get(Note, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if note.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    note = update_note(session=session, note=note, note_in=note_in)
    return NotePublic.model_validate(note)


@router.delete("/{note_id}")
def delete_note(
    session: SessionDep,
    current_user: CurrentUser,
    note_id: uuid.UUID,
) -> Any:
    """Delete a note."""
    note = session.get(Note, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if note.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    session.delete(note)
    session.commit()
    return {"ok": True}
