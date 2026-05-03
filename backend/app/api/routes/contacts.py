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


@router.get("/", response_model=ContactsPublic)
def list_contacts(
    session: SessionDep,
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

    if group_id:
        statement = statement.join(ContactGroup).where(
            ContactGroup.group_id == group_id
        )

    # Count (before pagination)
    count_statement = select(func.count()).select_from(statement.subquery())
    count = session.exec(count_statement).one()

    # Apply eager loading for relationships
    statement = statement.options(
        selectinload(Contact.tags),
        selectinload(Contact.groups),
    )

    # Apply ordering and pagination
    statement = (
        statement.order_by(col(Contact.first_name).asc(), col(Contact.last_name).asc())
        .offset(skip)
        .limit(limit)
    )
    contacts = session.exec(statement).all()

    # Convert to response model
    result = [ContactPublic.model_validate(contact) for contact in contacts]

    return ContactsPublic(data=result, count=count)


@router.get("/losing-touch", response_model=ContactsPublic)
def list_losing_touch(
    session: SessionDep,
limit: int = 20,
) -> Any:
    """Return contacts whose cadence has been exceeded.

    A contact is 'losing touch' if:
    - contact_frequency_days is set
    - last_contacted_at is NULL or older than contact_frequency_days ago
    """
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

    # Sort by most overdue first
    overdue.sort(
        key=lambda c: c.last_contacted_at or datetime.min.replace(tzinfo=timezone.utc)
    )

    # Convert to response model
    result = [ContactPublic.model_validate(contact) for contact in overdue[:limit]]

    return ContactsPublic(data=result, count=len(overdue))


@router.get("/{contact_id}", response_model=ContactPublic)
def get_contact(
    session: SessionDep,
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
contact_in: ContactCreate,
    background_tasks: BackgroundTasks,
) -> Any:
    """Create a new contact."""
    contact = Contact.model_validate(contact_in, update={"owner_id": current_user.id})
    session.add(contact)
    session.flush()  # Flush to get contact.id without committing

    # Handle tag associations
    if contact_in.tag_ids:
        for tag_id in contact_in.tag_ids:
            session.add(ContactTag(contact_id=contact.id, tag_id=tag_id))

    # Handle group associations
    if contact_in.group_ids:
        for group_id in contact_in.group_ids:
            session.add(ContactGroup(contact_id=contact.id, group_id=group_id))

    session.commit()

    # Reload contact with eager-loaded relationships
    statement = (
        select(Contact)
        .where(Contact.id == contact.id)
        .options(
            selectinload(Contact.tags),
            selectinload(Contact.groups),
        )
    )
    contact = session.exec(statement).first()

    # Enqueue indexing in background (non-blocking)
    background_tasks.add_task(_enqueue_contact_index, contact)
    return ContactPublic.model_validate(contact)


@router.patch("/{contact_id}", response_model=ContactPublic)
def update_contact(
    *,
    session: SessionDep,
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

    # Update tag associations if provided
    if tag_ids is not None:
        # Remove existing
        existing = session.exec(
            select(ContactTag).where(ContactTag.contact_id == contact.id)
        ).all()
        for ct in existing:
            session.delete(ct)
        # Add new
        for tag_id in tag_ids:
            session.add(ContactTag(contact_id=contact.id, tag_id=tag_id))

    # Update group associations if provided
    if group_ids is not None:
        existing = session.exec(
            select(ContactGroup).where(ContactGroup.contact_id == contact.id)
        ).all()
        for cg in existing:
            session.delete(cg)
        for group_id in group_ids:
            session.add(ContactGroup(contact_id=contact.id, group_id=group_id))

    session.commit()

    # Reload with eager loading
    statement = (
        select(Contact)
        .where(Contact.id == contact.id)
        .options(
            selectinload(Contact.tags),
            selectinload(Contact.groups),
        )
    )
    contact = session.exec(statement).first()

    # Enqueue indexing in background (non-blocking)
    background_tasks.add_task(_enqueue_contact_index, contact)
    return ContactPublic.model_validate(contact)


@router.delete("/{contact_id}")
def delete_contact(
    session: SessionDep,
contact_id: uuid.UUID,
    background_tasks: BackgroundTasks,
) -> Any:
    """Soft-delete a contact.

    Sets ``deleted_at`` instead of removing the row, so the contact and its
    related data (notes, interactions, addresses, etc.) can be restored. Use
    ``POST /contacts/{id}/restore`` to recover, or pass ``only_deleted=true``
    to ``GET /contacts/`` to view the trash.
    """
    contact = session.get(Contact, contact_id)
    if not contact or contact.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Contact not found")
    if contact.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    contact.deleted_at = datetime.now(timezone.utc)
    session.add(contact)
    session.commit()

    # Hide from search results while soft-deleted; restore re-indexes.
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
contact_id: uuid.UUID,
) -> Any:
    """List notes that @-mention this contact, with the source (authoring) contact."""
    contact = session.exec(
        select(Contact).where(
            Contact.id == contact_id,
            Contact.id.in_(visible_contact_ids(current_user)),
        )
    ).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    # Note's contact (its "page") is the source contact for the mention.
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
contact_id: uuid.UUID,
    background_tasks: BackgroundTasks,
) -> Any:
    """Restore a soft-deleted contact (clear ``deleted_at``)."""
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

    # Reload with eager loading so the response carries tags/groups.
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
