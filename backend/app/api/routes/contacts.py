from __future__ import annotations

"""Contact management routes."""

import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from arq.connections import RedisSettings
from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import selectinload
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, SessionDep
from app.core.config import settings as app_settings
from app.crud import visible_contact_ids
from app.models import (
    Contact,
    ContactCreate,
    ContactGroup,
    ContactPublic,
    ContactsPublic,
    ContactTag,
    ContactUpdate,
    Note,
    NoteMention,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/contacts", tags=["contacts"])


# ─── Bulk operations models ────────────────────────────────────────────────


class BulkContactFilter(BaseModel):
    """Filter criteria matching list_contacts parameters."""

    search: str | None = None
    tag_id: uuid.UUID | None = None
    group_id: uuid.UUID | None = None
    is_favorite: bool | None = None
    is_archived: bool | None = None
    stage: str | None = None


class BulkContactOperation(BaseModel):
    """A single operation to apply to matching contacts."""

    # Tag operations
    add_tag_ids: list[uuid.UUID] | None = None
    remove_tag_ids: list[uuid.UUID] | None = None
    # Group operations
    add_group_ids: list[uuid.UUID] | None = None
    remove_group_ids: list[uuid.UUID] | None = None
    # Field updates
    set_is_archived: bool | None = None
    set_is_favorite: bool | None = None


class BulkContactRequest(BaseModel):
    """Bulk operation request body."""

    # Either provide explicit contact_ids...
    contact_ids: list[uuid.UUID] | None = None
    # ...or use select_all_filtered with optional filters
    select_all_filtered: bool = False
    filters: BulkContactFilter | None = None
    # Max contacts per request (safety limit)
    limit: int = 500
    # Operations to apply
    operations: BulkContactOperation


class BulkContactResult(BaseModel):
    """Bulk operation result."""

    updated_count: int
    skipped_count: int
    failed_ids: list[uuid.UUID] = []


# ─── Helper functions ──────────────────────────────────────────────────────

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
    """Build a SQLAlchemy statement for contacts matching the given filters."""
    stmt = select(Contact).where(
        Contact.id.in_(visible_contact_ids(user, include_deleted=include_deleted))
    )

    if filters is None:
        # Default: exclude archived when not explicitly included
        stmt = stmt.where(Contact.is_archived.is_(False))
        return stmt

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
    if filters.group_id:
        stmt = stmt.join(ContactGroup).where(ContactGroup.group_id == filters.group_id)

    return stmt


@router.patch("/bulk", response_model=BulkContactResult)
def bulk_update_contacts(
    session: SessionDep,
    current_user: CurrentUser,
    body: BulkContactRequest,
) -> Any:
    """Bulk-update contacts atomically.

    Provide either:
    - ``contact_ids`` for an explicit list, or
    - ``select_all_filtered=true`` with optional ``filters`` to target every
      contact matching the current filter/sort/search (server-side).

    All-or-nothing semantics: the entire operation runs in a transaction.
    """

    limit = min(max(1, body.limit), 500)  # Cap at 500

    # Resolve target contact IDs
    if body.select_all_filtered:
        stmt = _build_filtered_contact_stmt(
            current_user, body.filters, include_deleted=False
        )
        stmt = stmt.limit(limit)
        contacts = session.exec(stmt).all()
    elif body.contact_ids:
        # Fetch only the requested IDs that are visible to the user
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
                # Tag operations
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
                        session.exec(
                            select(ContactTag).where(
                                ContactTag.contact_id == contact.id,
                                ContactTag.tag_id == tag_id,
                            )
                        ).delete()

                # Group operations
                if ops.add_group_ids is not None:
                    existing_group_ids = {
                        cg.group_id
                        for cg in session.exec(
                            select(ContactGroup).where(
                                ContactGroup.contact_id == contact.id
                            )
                        ).all()
                    }
                    for group_id in ops.add_group_ids:
                        if group_id not in existing_group_ids:
                            session.add(
                                ContactGroup(contact_id=contact.id, group_id=group_id)
                            )

                if ops.remove_group_ids is not None:
                    for group_id in ops.remove_group_ids:
                        session.exec(
                            select(ContactGroup).where(
                                ContactGroup.contact_id == contact.id,
                                ContactGroup.group_id == group_id,
                            )
                        ).delete()

                # Field updates
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
        logger.error(f"Bulk update transaction failed: {exc}")
        raise HTTPException(status_code=500, detail="Bulk update failed") from exc

    skipped_count = len(contacts) - updated_count - len(failed_ids)

    # Re-index updated contacts in search (fire-and-forget)
    try:
        import asyncio

        for contact in contacts:
            if contact.id not in failed_ids:
                asyncio.create_task(_enqueue_contact_index(contact))
    except Exception:
        pass  # Non-critical; search will catch up eventually

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
    group_id: uuid.UUID | None = None,
    is_favorite: bool | None = None,
    is_archived: bool | None = None,
    stage: str | None = None,
    limit: int = 500,
) -> Any:
    """Preview contacts that would be affected by a bulk operation."""

    limit = min(max(1, limit), 500)

    if not select_all_filtered:
        return ContactsPublic(data=[], count=0)

    filters = BulkContactFilter(
        search=search,
        tag_id=tag_id,
        group_id=group_id,
        is_favorite=is_favorite,
        is_archived=is_archived,
        stage=stage,
    )

    stmt = _build_filtered_contact_stmt(current_user, filters, include_deleted=False)
    count_stmt = select(func.count()).select_from(stmt.subquery())
    count = session.exec(count_stmt).one()

    stmt = stmt.options(
        selectinload(Contact.tags),
        selectinload(Contact.groups),
    ).limit(limit)

    contacts = session.exec(stmt).all()
    result = [ContactPublic.model_validate(c) for c in contacts]

    return ContactsPublic(data=result, count=count)


@router.get("/", response_model=ContactsPublic)
def list_contacts(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
    search: str | None = None,
    tag_id: uuid.UUID | None = None,
    group_id: uuid.UUID | None = None,
    is_favorite: bool | None = None,
    is_archived: bool | None = None,
    stage: str | None = None,
    include_deleted: bool = False,
    only_deleted: bool = False,
    ids: list[uuid.UUID] | None = Query(default=None),
) -> Any:
    """List contacts with filtering."""
    if only_deleted:
        include_deleted = True

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

    if is_archived is not None:
        statement = statement.where(Contact.is_archived == is_archived)
    elif ids is None:
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

    if group_id:
        statement = statement.join(ContactGroup).where(
            ContactGroup.group_id == group_id
        )

    count_statement = select(func.count()).select_from(statement.subquery())
    count = session.exec(count_statement).one()

    statement = statement.options(
        selectinload(Contact.tags),
        selectinload(Contact.groups),
    )

    statement = (
        statement.order_by(col(Contact.first_name).asc(), col(Contact.last_name).asc())
        .offset(skip)
        .limit(limit)
    )
    contacts = session.exec(statement).all()

    result = [ContactPublic.model_validate(contact) for contact in contacts]
    return ContactsPublic(data=result, count=count)


@router.get("/losing-touch", response_model=ContactsPublic)
def list_losing_touch(
    session: SessionDep,
    current_user: CurrentUser,
    limit: int = 20,
) -> Any:
    """Return contacts whose cadence has been exceeded."""
    now = datetime.now(timezone.utc)
    statement = (
        select(Contact)
        .where(
            Contact.id.in_(visible_contact_ids(current_user)),
            Contact.is_archived.is_(False),
            Contact.contact_frequency_days.is_not(None),
        )
        .options(
            selectinload(Contact.tags),
            selectinload(Contact.groups),
        )
    )
    contacts = session.exec(statement).all()

    overdue = []
    for contact in contacts:
        if contact.last_contacted_at is None:
            overdue.append(contact)
        else:
            deadline = contact.last_contacted_at + timedelta(
                days=contact.contact_frequency_days
            )
            if now > deadline:
                overdue.append(contact)

    overdue.sort(
        key=lambda c: c.last_contacted_at or datetime.min.replace(tzinfo=timezone.utc)
    )

    result = [ContactPublic.model_validate(contact) for contact in overdue[:limit]]
    return ContactsPublic(data=result, count=len(overdue))


@router.get("/{contact_id}", response_model=ContactPublic)
def get_contact(
    session: SessionDep,
    current_user: CurrentUser,
    contact_id: uuid.UUID,
) -> Any:
    """Get a single contact by ID."""
    statement = (
        select(Contact)
        .where(
            Contact.id == contact_id,
            Contact.id.in_(visible_contact_ids(current_user)),
        )
        .options(
            selectinload(Contact.tags),
            selectinload(Contact.groups),
        )
    )
    contact = session.exec(statement).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return ContactPublic.model_validate(contact)


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
    session.flush()

    if contact_in.tag_ids:
        for tag_id in contact_in.tag_ids:
            session.add(ContactTag(contact_id=contact.id, tag_id=tag_id))

    if contact_in.group_ids:
        for group_id in contact_in.group_ids:
            session.add(ContactGroup(contact_id=contact.id, group_id=group_id))

    session.commit()

    statement = (
        select(Contact)
        .where(Contact.id == contact.id)
        .options(
            selectinload(Contact.tags),
            selectinload(Contact.groups),
        )
    )
    contact = session.exec(statement).first()
    background_tasks.add_task(_enqueue_contact_index, contact)
    return ContactPublic.model_validate(contact)


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
    statement = (
        select(Contact)
        .where(Contact.id == contact_id)
        .options(
            selectinload(Contact.tags),
            selectinload(Contact.groups),
        )
    )
    contact = session.exec(statement).first()
    if not contact or contact.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Contact not found")
    if contact.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    update_data = contact_in.model_dump(exclude_unset=True)
    tag_ids = update_data.pop("tag_ids", None)
    group_ids = update_data.pop("group_ids", None)

    contact.sqlmodel_update(update_data)
    session.add(contact)

    if tag_ids is not None:
        existing = session.exec(
            select(ContactTag).where(ContactTag.contact_id == contact.id)
        ).all()
        for ct in existing:
            session.delete(ct)
        for tag_id in tag_ids:
            session.add(ContactTag(contact_id=contact.id, tag_id=tag_id))

    if group_ids is not None:
        existing = session.exec(
            select(ContactGroup).where(ContactGroup.contact_id == contact.id)
        ).all()
        for cg in existing:
            session.delete(cg)
        for group_id in group_ids:
            session.add(ContactGroup(contact_id=contact.id, group_id=group_id))

    session.commit()

    statement = (
        select(Contact)
        .where(Contact.id == contact.id)
        .options(
            selectinload(Contact.tags),
            selectinload(Contact.groups),
        )
    )
    contact = session.exec(statement).first()
    background_tasks.add_task(_enqueue_contact_index, contact)
    return ContactPublic.model_validate(contact)


@router.delete("/{contact_id}")
def delete_contact(
    session: SessionDep,
    current_user: CurrentUser,
    contact_id: uuid.UUID,
    background_tasks: BackgroundTasks,
) -> Any:
    """Soft-delete a contact."""
    contact = session.get(Contact, contact_id)
    if not contact or contact.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Contact not found")
    if contact.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    contact.deleted_at = datetime.now(timezone.utc)
    session.add(contact)
    session.commit()
    background_tasks.add_task(_enqueue_contact_removal, str(contact_id))
    return {"ok": True}


class _MentionSourceContact(BaseModel):
    id: uuid.UUID
    first_name: str
    last_name: str | None = None
    avatar_url: str | None = None


class NoteMentionPublic(BaseModel):
    note_id: uuid.UUID
    note_body: str
    note_created_at: datetime
    source_contact: _MentionSourceContact


@router.get("/{contact_id}/mentions", response_model=list[NoteMentionPublic])
def list_contact_mentions(
    session: SessionDep,
    current_user: CurrentUser,
    contact_id: uuid.UUID,
) -> Any:
    """List notes that @-mention this contact."""
    contact = session.exec(
        select(Contact).where(
            Contact.id == contact_id,
            Contact.id.in_(visible_contact_ids(current_user)),
        )
    ).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    rows = session.exec(
        select(Note, Contact)
        .join(NoteMention, NoteMention.note_id == Note.id)
        .join(Contact, Contact.id == Note.contact_id)
        .where(
            NoteMention.contact_id == contact_id,
            Note.owner_id == current_user.id,
            Note.contact_id != contact_id,
        )
        .order_by(Note.created_at.desc())
    ).all()

    return [
        NoteMentionPublic(
            note_id=note.id,
            note_body=note.body,
            note_created_at=note.created_at,
            source_contact=_MentionSourceContact(
                id=src.id,
                first_name=src.first_name,
                last_name=src.last_name,
                avatar_url=src.avatar_url,
            ),
        )
        for note, src in rows
    ]


@router.post("/{contact_id}/restore", response_model=ContactPublic)
def restore_contact(
    session: SessionDep,
    current_user: CurrentUser,
    contact_id: uuid.UUID,
    background_tasks: BackgroundTasks,
) -> Any:
    """Restore a soft-deleted contact."""
    contact = session.get(Contact, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    if contact.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    if contact.deleted_at is None:
        raise HTTPException(status_code=400, detail="Contact is not deleted")

    contact.deleted_at = None
    session.add(contact)
    session.commit()

    statement = (
        select(Contact)
        .where(Contact.id == contact.id)
        .options(
            selectinload(Contact.tags),
            selectinload(Contact.groups),
        )
    )
    contact = session.exec(statement).first()
    background_tasks.add_task(_enqueue_contact_index, contact)
    return ContactPublic.model_validate(contact)
