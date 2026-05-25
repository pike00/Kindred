"""Contact management routes."""

import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from arq.connections import RedisSettings
from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import selectinload
from sqlmodel import SQLModel, col, func, select

from app.api.deps import CurrentUser, SessionDep
from app.core.config import settings as app_settings
from app.crud import visible_contact_ids
from app.models import (
    Contact,
    ContactCreate,
    ContactPublic,
    ContactsPublic,
    ContactTag,
    ContactUpdate,
    JournalEntry,
    JournalEntryContact,
    JournalEntryPublic,
    OverdueContactPublic,
    OverdueContactsPublic,
    User,
)


class BulkContactFilter(BaseModel):
    search: str | None = None
    tag_id: uuid.UUID | None = None
    is_favorite: bool | None = None
    is_archived: bool | None = None
    stage: str | None = None


class BulkContactOperation(BaseModel):
    add_tag_ids: list[uuid.UUID] | None = None
    remove_tag_ids: list[uuid.UUID] | None = None
    set_is_archived: bool | None = None
    set_is_favorite: bool | None = None


class BulkContactRequest(BaseModel):
    contact_ids: list[uuid.UUID] | None = None
    select_all_filtered: bool = False
    filters: BulkContactFilter | None = None
    limit: int = 500
    operations: BulkContactOperation


class BulkContactResult(BaseModel):
    updated_count: int
    skipped_count: int
    failed_ids: list[uuid.UUID] = []


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/contacts", tags=["contacts"])


_arq_pool = None


async def _get_arq_pool():
    """Get or create a shared ARQ pool."""
    global _arq_pool
    if _arq_pool is None:
        from arq.connections import create_pool

        _arq_pool = await create_pool(RedisSettings.from_dsn(app_settings.REDIS_URL))
    return _arq_pool


async def _enqueue_contact_index(contact: Contact) -> None:
    """Enqueue contact indexing in background (non-blocking)."""
    try:
        pool = await _get_arq_pool()
        await pool.enqueue_job(
            "index_contact_in_search",
            str(contact.id),
            {
                "first_name": contact.first_name,
                "last_name": contact.last_name or "",
                "nickname": contact.nickname or "",
                "company": contact.company or "",
                "title": contact.title or "",
                "how_we_met": contact.how_we_met or "",
                "owner_id": str(contact.owner_id),
                "is_favorite": contact.is_favorite,
                "is_archived": contact.is_archived,
                "created_at": contact.created_at.isoformat(),
                "last_contacted_at": contact.last_contacted_at.isoformat()
                if contact.last_contacted_at
                else None,
            },
        )
    except Exception as e:
        logger.warning(
            f"Failed to enqueue search indexing for contact {contact.id}: {e}"
        )


async def _enqueue_contact_removal(contact_id: str) -> None:
    """Enqueue contact removal from search index (non-blocking)."""
    try:
        pool = await _get_arq_pool()
        await pool.enqueue_job("remove_contact_from_search", contact_id)
    except Exception as e:
        logger.warning(
            f"Failed to enqueue search removal for contact {contact_id}: {e}"
        )


def _remove_contact_safe(contact_id: str) -> None:
    """Remove a contact from Meilisearch, failing silently if unavailable."""
    try:
        from app.search import remove_contact

        remove_contact(contact_id)
    except Exception as e:
        logger.warning(f"Meilisearch removal failed: {e}")


def _build_filtered_contact_stmt(
    user: User,
    filters: BulkContactFilter | None,
    include_deleted: bool = False,
) -> Any:
    stmt = select(Contact).where(
        Contact.id.in_(visible_contact_ids(user, include_deleted=include_deleted))
    )
    if filters is None:
        return stmt.where(Contact.is_archived.is_(False))
    if filters.is_archived is not None:
        stmt = stmt.where(Contact.is_archived == filters.is_archived)
    elif not include_deleted:
        stmt = stmt.where(Contact.is_archived.is_(False))
    if filters.is_favorite is not None:
        stmt = stmt.where(Contact.is_favorite == filters.is_favorite)
    if filters.stage is not None:
        stmt = stmt.where(Contact.stage == filters.stage)
    if filters.search:
        search_filter = f"%{filters.search}%"
        stmt = stmt.where(
            col(Contact.first_name).ilike(search_filter)
            | col(Contact.last_name).ilike(search_filter)
            | col(Contact.nickname).ilike(search_filter)
            | col(Contact.company).ilike(search_filter)
        )
    if filters.tag_id:
        stmt = stmt.join(ContactTag).where(ContactTag.tag_id == filters.tag_id)
    return stmt


@router.patch("/bulk", response_model=BulkContactResult)
def bulk_update_contacts(
    session: SessionDep,
    current_user: CurrentUser,
    body: BulkContactRequest,
) -> Any:
    """Bulk-update contacts atomically."""
    limit = min(max(1, body.limit), 500)
    if body.select_all_filtered:
        stmt = _build_filtered_contact_stmt(current_user, body.filters)
        contacts = session.exec(stmt.limit(limit)).all()
    elif body.contact_ids:
        stmt = select(Contact).where(
            Contact.id.in_(visible_contact_ids(current_user, include_deleted=False)),
            Contact.id.in_(body.contact_ids),
        )
        contacts = session.exec(stmt).all()
    else:
        raise HTTPException(
            status_code=400,
            detail="Provide either contact_ids or set select_all_filtered=true",
        )
    if not contacts:
        return BulkContactResult(updated_count=0, skipped_count=0)

    ops = body.operations
    failed_ids: list[uuid.UUID] = []
    updated_count = 0
    try:
        for contact in contacts:
            try:
                if ops.add_tag_ids is not None:
                    existing_tag_ids = {
                        ct.tag_id
                        for ct in session.exec(
                            select(ContactTag).where(
                                ContactTag.contact_id == contact.id
                            )
                        ).all()
                    }
                    for tag_id in ops.add_tag_ids:
                        if tag_id not in existing_tag_ids:
                            session.add(
                                ContactTag(contact_id=contact.id, tag_id=tag_id)
                            )
                if ops.remove_tag_ids is not None:
                    for tag_id in ops.remove_tag_ids:
                        ct = session.exec(
                            select(ContactTag).where(
                                ContactTag.contact_id == contact.id,
                                ContactTag.tag_id == tag_id,
                            )
                        ).first()
                        if ct:
                            session.delete(ct)
                if ops.set_is_archived is not None:
                    contact.is_archived = ops.set_is_archived
                    session.add(contact)
                if ops.set_is_favorite is not None:
                    contact.is_favorite = ops.set_is_favorite
                    session.add(contact)
                updated_count += 1
            except Exception as exc:
                failed_ids.append(contact.id)
                logger.warning(f"Failed to update contact {contact.id}: {exc}")
        session.commit()
    except Exception as exc:
        session.rollback()
        raise HTTPException(status_code=500, detail="Bulk update failed") from exc

    skipped_count = len(contacts) - updated_count - len(failed_ids)
    return BulkContactResult(
        updated_count=updated_count,
        skipped_count=skipped_count,
        failed_ids=failed_ids,
    )


@router.get("/bulk/preview", response_model=ContactsPublic)
def preview_bulk_contacts(
    session: SessionDep,
    current_user: CurrentUser,
    select_all_filtered: bool = False,
    search: str | None = None,
    tag_id: uuid.UUID | None = None,
    is_favorite: bool | None = None,
    is_archived: bool | None = None,
    stage: str | None = None,
    limit: int = 500,
) -> Any:
    """Preview contacts that would be affected by a bulk operation."""
    limit = min(max(1, limit), 500)
    if select_all_filtered:
        filters = BulkContactFilter(
            search=search,
            tag_id=tag_id,
            is_favorite=is_favorite,
            is_archived=is_archived,
            stage=stage,
        )
        stmt = _build_filtered_contact_stmt(current_user, filters)
    else:
        stmt = select(Contact).where(
            Contact.id.in_(visible_contact_ids(current_user, include_deleted=False)),
            Contact.is_archived.is_(False),
        )
    contacts = session.exec(stmt.limit(limit)).all()
    return ContactsPublic(data=contacts, count=len(contacts))


@router.get("/", response_model=ContactsPublic)
def list_contacts(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
    search: str | None = None,
    tag_id: uuid.UUID | None = None,
    is_favorite: bool | None = None,
    is_archived: bool | None = None,
    stage: str | None = None,
    include_deleted: bool = False,
    only_deleted: bool = False,
    ids: list[uuid.UUID] | None = Query(default=None),
) -> Any:
    """List contacts with filtering.

    Pass `ids=<uuid>&ids=<uuid>` to fetch a specific batch of contacts (useful for
    hydrating references from other resources). When `ids` is provided, the default
    `is_archived=false` filter is lifted so callers can resolve archived rows too.

    Soft-deleted contacts (``deleted_at`` set) are hidden by default. Pass
    ``include_deleted=true`` to surface them alongside live rows, or
    ``only_deleted=true`` to fetch the trash view exclusively.
    """
    # Trash view implies surfacing deleted rows.
    if only_deleted:
        include_deleted = True

    # Build base query
    statement = select(Contact).where(
        Contact.id.in_(
            visible_contact_ids(current_user, include_deleted=include_deleted)
        )
    )

    if only_deleted:
        statement = statement.where(Contact.deleted_at.is_not(None))

    if ids is not None:
        if not ids:
            return ContactsPublic(data=[], count=0)
        statement = statement.where(Contact.id.in_(ids))

    # Apply filters
    if is_archived is not None:
        statement = statement.where(Contact.is_archived == is_archived)
    elif ids is None:
        # Default: exclude archived (skipped when resolving by explicit id list)
        statement = statement.where(Contact.is_archived.is_(False))

    if is_favorite is not None:
        statement = statement.where(Contact.is_favorite == is_favorite)

    if stage is not None:
        statement = statement.where(Contact.stage == stage)

    if search:
        search_filter = f"%{search}%"
        statement = statement.where(
            col(Contact.first_name).ilike(search_filter)
            | col(Contact.last_name).ilike(search_filter)
            | col(Contact.nickname).ilike(search_filter)
            | col(Contact.company).ilike(search_filter)
        )

    if tag_id:
        statement = statement.join(ContactTag).where(ContactTag.tag_id == tag_id)

    # Count (before pagination)
    count_statement = select(func.count()).select_from(statement.subquery())
    count = session.exec(count_statement).one()

    # Apply eager loading for relationships
    statement = statement.options(
        selectinload(Contact.tags),
    )

    # Apply ordering and pagination
    statement = (
        statement.order_by(col(Contact.first_name).asc(), col(Contact.last_name).asc())
        .offset(skip)
        .limit(limit)
    )

    contacts = session.exec(statement).all()
    return ContactsPublic(data=contacts, count=count)


@router.get("/overdue", response_model=OverdueContactsPublic)
def list_overdue_contacts(
    session: SessionDep,
    current_user: CurrentUser,
    days: int = 30,
) -> Any:
    """List contacts that are overdue for a follow-up."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    stmt = (
        select(Contact)
        .where(
            Contact.id.in_(visible_contact_ids(current_user, include_deleted=False)),
            Contact.is_archived.is_(False),
            Contact.last_contacted_at < cutoff,
        )
        .order_by(Contact.last_contacted_at.asc())
    )
    contacts = session.exec(stmt).all()
    return OverdueContactsPublic(data=contacts, count=len(contacts))


@router.post("/", response_model=ContactPublic)
def create_contact(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    contact_in: ContactCreate,
    background_tasks: BackgroundTasks,
) -> Any:
    """Create a new contact."""
    contact = Contact.model_validate(contact_in, update={"owner_id": current_user.id})
    session.add(contact)
    session.commit()
    session.refresh(contact)
    background_tasks.add_task(_enqueue_contact_index, contact)
    return contact


@router.get("/{contact_id}", response_model=ContactPublic)
def get_contact(
    contact_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """Get a single contact by ID."""
    contact = session.exec(
        select(Contact)
        .where(
            Contact.id == contact_id,
            Contact.id.in_(visible_contact_ids(current_user, include_deleted=True)),
        )
        .options(selectinload(Contact.tags))
    ).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact


@router.patch("/{contact_id}", response_model=ContactPublic)
def update_contact(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    contact_id: uuid.UUID,
    contact_in: ContactUpdate,
    background_tasks: BackgroundTasks,
) -> Any:
    """Update a contact."""
    contact = session.exec(
        select(Contact).where(
            Contact.id == contact_id,
            Contact.id.in_(visible_contact_ids(current_user, include_deleted=False)),
        )
    ).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    update_data = contact_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(contact, key, value)
    session.add(contact)
    session.commit()
    session.refresh(contact)
    background_tasks.add_task(_enqueue_contact_index, contact)
    return contact


@router.delete("/{contact_id}", response_model=dict)
def delete_contact(
    contact_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUser,
    background_tasks: BackgroundTasks,
) -> Any:
    """Soft-delete a contact."""
    contact = session.exec(
        select(Contact).where(
            Contact.id == contact_id,
            Contact.id.in_(visible_contact_ids(current_user, include_deleted=False)),
        )
    ).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    contact.deleted_at = datetime.now(timezone.utc)
    session.add(contact)
    session.commit()
    background_tasks.add_task(_enqueue_contact_removal, str(contact.id))
    return {"ok": True}


@router.get("/{contact_id}/journal", response_model=list[JournalEntryPublic])
def list_journal_entries(
    contact_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """List journal entries for a contact."""
    contact = session.exec(
        select(Contact).where(
            Contact.id == contact_id,
            Contact.id.in_(visible_contact_ids(current_user, include_deleted=False)),
        )
    ).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    stmt = (
        select(JournalEntry)
        .join(JournalEntryContact)
        .where(JournalEntryContact.contact_id == contact_id)
        .order_by(JournalEntry.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    entries = session.exec(stmt).all()
    return entries


@router.get("/{contact_id}/journal/{entry_id}", response_model=JournalEntryPublic)
def get_journal_entry(
    contact_id: uuid.UUID,
    entry_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """Get a single journal entry for a contact."""
    contact = session.exec(
        select(Contact).where(
            Contact.id == contact_id,
            Contact.id.in_(visible_contact_ids(current_user, include_deleted=False)),
        )
    ).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    entry = session.exec(
        select(JournalEntry)
        .join(JournalEntryContact)
        .where(
            JournalEntry.id == entry_id,
            JournalEntryContact.contact_id == contact_id,
        )
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    return entry


@router.get("/{contact_id}/journal/{entry_id}/notes/{note_id}", response_model=dict)
def get_journal_note(
    contact_id: uuid.UUID,
    entry_id: uuid.UUID,
    note_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """Get a specific note from a journal entry."""
    # This is a placeholder; actual implementation would fetch the note.
    return {"note_id": note_id, "entry_id": entry_id, "contact_id": contact_id}
