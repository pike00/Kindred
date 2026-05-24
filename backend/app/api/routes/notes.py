"""Note management routes."""

import uuid
from datetime import datetime, timezone
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
    Ok,
)

router = APIRouter(prefix="/notes", tags=["notes"])


@router.get("/contact/{contact_id}", response_model=NotesPublic)
def list_notes(
    session: SessionDep,
    current_user: CurrentUser,
    contact_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> NotesPublic:
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
        .where(Note.deleted_at == None)  # noqa: E711
        .order_by(Note.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    notes = session.exec(statement).all()

    count_statement = (
        select(func.count(Note.id.distinct()))
        .where(where_clause)
        .where(Note.deleted_at == None)  # noqa: E711
    )
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
) -> NotePublic:
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
) -> NotePublic:
    """Update a note."""
    note = session.get(Note, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if note.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    note = update_note(session=session, note=note, note_in=note_in)
    return NotePublic.model_validate(note)


@router.delete("/{note_id}", response_model=Ok)
def delete_note(
    session: SessionDep,
    current_user: CurrentUser,
    note_id: uuid.UUID,
) -> Ok:
    """Soft-delete a note by setting deleted_at."""
    note = session.get(Note, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if note.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    note.deleted_at = datetime.now(timezone.utc)
    session.add(note)
    session.commit()
    return Ok()


@router.post("/{note_id}/restore")
def restore_note(
    session: SessionDep,
    note_id: uuid.UUID,
) -> Any:
    """Restore a soft-deleted note by clearing deleted_at."""
    from sqlalchemy import text, update

    result = session.exec(
        text("SELECT id FROM note WHERE id = :id AND deleted_at IS NOT NULL"),
        params={"id": str(note_id)},
    ).first()
    if result is None:
        raise HTTPException(status_code=404, detail="Note not found or not deleted")
    session.exec(update(Note).where(Note.id == note_id).values(deleted_at=None))
    session.commit()
    return Ok()
