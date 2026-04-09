"""Note management routes."""

import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.crud import create_note
from app.models import Contact, Note, NoteCreate, NotePublic, NoteUpdate, NotesPublic

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

    statement = (
        select(Note)
        .where(Note.contact_id == contact_id)
        .order_by(Note.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    notes = session.exec(statement).all()

    count_statement = select(func.count(Note.id)).where(Note.contact_id == contact_id)
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
def update_note(
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

    update_data = note_in.model_dump(exclude_unset=True)
    note.sqlmodel_update(update_data)
    session.add(note)
    session.commit()
    session.refresh(note)
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
