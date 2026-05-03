"""Contact management routes."""

import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from arq.connections import RedisSettings
from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
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
    JournalEntry,
    JournalEntryContact,
    JournalEntryPublic,
    OverdueContactPublic,
    OverdueContactsPublic,
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
    current_user: CurrentUser,
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


@router.get("/overdue", response_model=OverdueContactsPublic)
def list_overdue_contacts(
    session: SessionDep,
    current_user: CurrentUser,
    limit: int = 50,
    offset: int = 0,
) -> Any:
    """Return contacts sorted by days_overdue descending.

    Days overdue = (now - last_contacted_at).days - contact_frequency_days.
    Contacts with no frequency set or no interactions are excluded.
    """
    now = datetime.now(timezone.utc)
    statement = (
        select(Contact)
        .where(
            Contact.id.in_(visible_contact_ids(current_user)),
            Contact.is_archived.is_(False),
            Contact.contact_frequency_days.is_not(None),
            Contact.do_not_contact.is_(False),
        )
        .options(
            selectinload(Contact.tags),
            selectinload(Contact.groups),
        )
    )
    contacts = session.exec(statement).all()

    overdue_data = []
    for contact in contacts:
        if contact.last_contacted_at is None:
            # Never contacted - use created_at as reference or just use frequency
            days_since = contact.contact_frequency_days or 0
            days_overdue = days_since
        else:
            days_since = (now - contact.last_contacted_at).days
            days_overdue = days_since - (contact.contact_frequency_days or 0)

        if days_overdue >= 0:
            overdue_data.append(
                {
                    "contact": contact,
                    "days_overdue": days_overdue,
                }
            )

    # Sort by days_overdue descending
    overdue_data.sort(key=lambda x: x["days_overdue"], reverse=True)

    # Apply pagination
    total = len(overdue_data)
    paginated = overdue_data[offset : offset + limit]

    result = []
    for item in paginated:
        contact_public = OverdueContactPublic.model_validate(item["contact"])
        contact_public.days_overdue = item["days_overdue"]
        result.append(contact_public)

    return OverdueContactsPublic(data=result, count=total)


@router.patch("/{contact_id}/skip", response_model=ContactPublic)
def skip_contact(
    session: SessionDep,
    current_user: CurrentUser,
    contact_id: uuid.UUID,
) -> Any:
    """Skip a contact for 7 days by creating a SKIP interaction.

    This advances the next due date without recording a user-facing interaction.
    """
    contact = session.get(Contact, contact_id)
    if not contact or contact.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Contact not found")
    if contact.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    # Create a SKIP interaction
    from app.crud import create_interaction
    from app.models import InteractionCreate

    skip_interaction = InteractionCreate(
        attendee_ids=[contact_id],
        channel="skip",
        occurred_at=datetime.now(timezone.utc),
        notes="Skipped for 7 days",
    )

    create_interaction(
        session=session,
        interaction_in=skip_interaction,
        owner_id=current_user.id,
    )

    session.refresh(contact)
    return ContactPublic.model_validate(contact)


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
    current_user: CurrentUser,
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


@router.post("/{contact_id}/restore", response_model=ContactPublic)
def restore_contact(
    session: SessionDep,
    current_user: CurrentUser,
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


@router.get("/{contact_id}/reflections", response_model=list[JournalEntryPublic])
def list_contact_reflections(
    session: SessionDep,
    current_user: CurrentUser,
    contact_id: uuid.UUID,
) -> Any:
    """List journal entries that reference this contact."""
    contact = session.exec(
        select(Contact).where(
            Contact.id == contact_id,
            Contact.id.in_(visible_contact_ids(current_user)),
        )
    ).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    # Get journal entry IDs that reference this contact
    journal_ids_stmt = select(JournalEntryContact.journal_entry_id).where(
        JournalEntryContact.contact_id == contact_id
    )
    journal_ids = list(session.exec(journal_ids_stmt).all())

    if not journal_ids:
        return []

    # Get journal entries owned by the current user
    entries = session.exec(
        select(JournalEntry)
        .where(
            JournalEntry.id.in_(journal_ids),
            JournalEntry.owner_id == current_user.id,
        )
        .order_by(JournalEntry.entry_date.desc())
    ).all()

    # Load contact IDs for each entry
    for entry in entries:
        contact_ids_stmt = select(JournalEntryContact.contact_id).where(
            JournalEntryContact.journal_entry_id == entry.id
        )
        entry.contact_ids = list(session.exec(contact_ids_stmt).all())

    return [JournalEntryPublic.model_validate(e) for e in entries]
