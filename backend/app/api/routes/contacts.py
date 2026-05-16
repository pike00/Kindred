"""Contact management routes."""

import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from arq.connections import RedisSettings
from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import selectinload
from sqlmodel import SQLModel, col, func, select, Field

from app.api.deps import CurrentUser, SessionDep
from app.core.config import settings as app_settings
from app.crud import visible_contact_ids
from app.household import get_household_members
from app.models import (
    Contact,
    ContactCreate,
    ContactPublic,
    ContactsPublic,
    ContactTag,
    ContactUpdate,
    Note,
    NoteMention,
    OverdueContactPublic,
    OverdueContactsPublic,
    Relationship,
    User,
    ContactSource,
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

    session.commit()

    # Reload contact with eager-loaded relationships
    statement = (
        select(Contact)
        .where(Contact.id == contact.id)
        .options(
            selectinload(Contact.tags),
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
        )
    )
    contact = session.exec(statement).first()
    if not contact or contact.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Contact not found")
    if contact.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    update_data = contact_in.model_dump(exclude_unset=True)
    tag_ids = update_data.pop("tag_ids", None)

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

    session.commit()

    # Reload with eager loading
    statement = (
        select(Contact)
        .where(Contact.id == contact.id)
        .options(
            selectinload(Contact.tags),
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

    # Reload with eager loading so the response carries tags.
    statement = (
        select(Contact)
        .where(Contact.id == contact.id)
        .options(
            selectinload(Contact.tags),
        )
    )
    contact = session.exec(statement).first()
    background_tasks.add_task(_enqueue_contact_index, contact)
    return ContactPublic.model_validate(contact)


class _MentionPublic(SQLModel):
    note_id: uuid.UUID
    note_body: str
    note_created_at: datetime
    source_contact: ContactPublic


@router.get("/{contact_id}/mentions", response_model=list[_MentionPublic])
def list_contact_mentions(
    session: SessionDep,
    current_user: CurrentUser,
    contact_id: uuid.UUID,
) -> Any:
    """Return notes that @-mention this contact, grouped with the source contact."""
    contact = session.get(Contact, contact_id)
    if not contact or contact.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Contact not found")

    stmt = (
        select(NoteMention, Note, Contact)
        .join(Note, Note.id == NoteMention.note_id)
        .join(Contact, Contact.id == Note.contact_id)
        .where(NoteMention.contact_id == contact_id)
        .where(Contact.owner_id == current_user.id)
        .options(selectinload(Contact.tags))
    )
    rows = session.exec(stmt).all()
    return [
        _MentionPublic(
            note_id=note_mention.note_id,
            note_body=note.body,
            note_created_at=note.created_at,
            source_contact=ContactPublic.model_validate(source),
        )
        for note_mention, note, source in rows
    ]


# ─── iMessage Sync Models ─────────────────────────────────────────────────


class IMessageProfilePayload(SQLModel):
    """iMessage profile data from social.json."""

    imessage_id: str = Field(
        description="E.164 phone or email for stable iMessage identity."
    )
    relationship_type: str | None = Field(
        default=None,
        description="iMessage relationship type (close_friend, family, etc.).",
    )
    key_events: list[str] | None = Field(
        default=None, description="Key events from iMessage."
    )
    topics: list[str] | None = Field(
        default=None, description="Topics discussed in messages."
    )
    facts_about_other: str | None = Field(
        default=None, description="Facts about the contact from message analysis."
    )
    pattern_notes: str | None = Field(
        default=None, description="Pattern notes from iMessage analysis."
    )
    last_ts: int | None = Field(
        default=None,
        description="Last message timestamp (Unix epoch).",
    )
    message_count: int | None = Field(
        default=None,
        description="Total message count.",
    )
    profile_hash: str | None = Field(
        default=None,
        max_length=64,
        description="Hash of profile data for idempotent updates.",
    )


class IMessageSyncRequest(SQLModel):
    """Request body for iMessage sync."""

    profiles: list[IMessageProfilePayload] = Field(
        description="List of iMessage profiles to sync."
    )
    sync_co_mentions: bool = Field(
        default=False,
        description="Whether to also sync co-mention edges as relationships.",
    )
    co_mentions: list[dict] | None = Field(
        default=None,
        description="Co-mention edges from social.json.",
    )


class IMessageSyncResult(SQLModel):
    """Result of iMessage sync operation."""

    created_count: int = 0
    updated_count: int = 0
    skipped_count: int = 0
    failed_ids: list[str] = []


class IMessageProfileResponse(SQLModel):
    """Response model for iMessage profile endpoint."""

    imessage_id: str | None = None
    imessage_synced_at: datetime | None = None
    imessage_profile: dict | None = None
    profile_hash: str | None = None


# ─── iMessage Sync Endpoints ─────────────────────────────────────────────


@router.post("/imessage-sync", response_model=IMessageSyncResult)
def sync_imessage_contacts(
    session: SessionDep,
    current_user: CurrentUser,
    body: IMessageSyncRequest,
) -> Any:
    """Sync iMessage profiles to kindred contacts.

    Performs idempotent upsert: matches by imessage_id (E.164 phone or email).
    Updates if profile_hash changed, skips if unchanged.
    """
    import hashlib
    import json

    created = 0
    updated = 0
    skipped = 0
    failed_ids: list[str] = []

    for profile in body.profiles:
        try:
            # Check if contact exists by imessage_id
            existing = session.exec(
                select(Contact).where(
                    Contact.owner_id == current_user.id,
                    Contact.imessage_id == profile.imessage_id,
                )
            ).first()

            # Prepare profile data
            profile_data = {
                "relationship_type": profile.relationship_type,
                "key_events": profile.key_events,
                "topics": profile.topics,
                "facts_about_other": profile.facts_about_other,
                "pattern_notes": profile.pattern_notes,
                "last_ts": profile.last_ts,
                "message_count": profile.message_count,
            }

            # Calculate hash for idempotency
            new_hash = None
            if profile.profile_hash:
                new_hash = profile.profile_hash
            else:
                # Calculate hash from profile data
                profile_json = json.dumps(profile_data, sort_keys=True, default=str)
                new_hash = hashlib.sha256(profile_json.encode()).hexdigest()

            if existing:
                # Check if unchanged (idempotent update)
                if existing.imessage_profile_hash == new_hash:
                    skipped += 1
                    continue

                # Update existing contact with iMessage data
                existing.imessage_id = profile.imessage_id
                existing.imessage_synced_at = datetime.now(timezone.utc)
                existing.imessage_profile_hash = new_hash
                existing.imessage_profile = profile_data

                # Update last_contacted_at if we have a more recent timestamp
                if profile.last_ts:
                    from datetime import datetime as dt

                    msg_dt = dt.fromtimestamp(profile.last_ts, tz=timezone.utc)
                    if (
                        not existing.last_contacted_at
                        or msg_dt > existing.last_contacted_at
                    ):
                        existing.last_contacted_at = msg_dt

                session.add(existing)
                updated += 1
            else:
                # Create new contact from iMessage profile
                # Try to extract name from imessage_id or use a default
                first_name = "Imported"
                # Check if imessage_id looks like an email
                if "@" in profile.imessage_id:
                    first_name = profile.imessage_id.split("@")[0]
                else:
                    # Assume it's a phone number
                    first_name = "Contact"

                new_contact = Contact(
                    first_name=first_name,
                    source=ContactSource.WEBHOOK,
                    source_external_id=profile.imessage_id,
                    imessage_id=profile.imessage_id,
                    imessage_synced_at=datetime.now(timezone.utc),
                    imessage_profile_hash=new_hash,
                    imessage_profile=profile_data,
                    owner_id=current_user.id,
                )

                # Set last_contacted_at if available
                if profile.last_ts:
                    from datetime import datetime as dt

                    new_contact.last_contacted_at = dt.fromtimestamp(
                        profile.last_ts, tz=timezone.utc
                    )

                session.add(new_contact)
                created += 1

        except Exception as exc:
            failed_ids.append(profile.imessage_id)
            logger.warning(
                f"Failed to sync iMessage profile {profile.imessage_id}: {exc}"
            )

    session.commit()

    # Handle co-mention edges if requested
    if body.sync_co_mentions and body.co_mentions:
        _sync_co_mention_edges(session, current_user, body.co_mentions)
        session.commit()

    return IMessageSyncResult(
        created_count=created,
        updated_count=updated,
        skipped_count=skipped,
        failed_ids=failed_ids,
    )


def _sync_co_mention_edges(
    session: SessionDep,
    current_user: User,
    co_mentions: list[dict],
) -> None:
    """Sync co-mention edges as relationships between contacts."""
    for edge in co_mentions:
        try:
            source_id = edge.get("source")
            target_id = edge.get("target")
            if not source_id or not target_id:
                continue

            # Find contacts by imessage_id
            source_contact = session.exec(
                select(Contact).where(
                    Contact.owner_id == current_user.id,
                    Contact.imessage_id == source_id,
                )
            ).first()

            target_contact = session.exec(
                select(Contact).where(
                    Contact.owner_id == current_user.id,
                    Contact.imessage_id == target_id,
                )
            ).first()

            if not source_contact or not target_contact:
                continue

            # Check if relationship already exists
            existing = session.exec(
                select(Relationship).where(
                    Relationship.contact_id == source_contact.id,
                    Relationship.related_contact_id == target_contact.id,
                    Relationship.relationship_type == "co-mentioned",
                )
            ).first()

            if not existing:
                # Create co-mention relationship
                weight = edge.get("weight", 0)
                rel = Relationship(
                    contact_id=source_contact.id,
                    related_contact_id=target_contact.id,
                    relationship_type="co-mentioned",
                    notes=f"Co-mentioned in iMessage (weight: {weight})",
                )
                session.add(rel)

        except Exception as exc:
            logger.warning(f"Failed to sync co-mention edge {edge}: {exc}")


@router.get("/{contact_id}/imessage-profile", response_model=IMessageProfileResponse)
def get_imessage_profile(
    session: SessionDep,
    current_user: CurrentUser,
    contact_id: uuid.UUID,
) -> Any:
    """Get the raw iMessage profile for a contact."""
    contact = session.get(Contact, contact_id)
    if not contact or contact.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Contact not found")
    if contact.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    return IMessageProfileResponse(
        imessage_id=contact.imessage_id,
        imessage_synced_at=contact.imessage_synced_at,
        imessage_profile=contact.imessage_profile,
        profile_hash=contact.imessage_profile_hash,
    )


@router.get("/{contact_id}/household")
def get_contact_household(
    session: SessionDep,
    current_user: CurrentUser,
    contact_id: uuid.UUID,
) -> Any:
    """Get household members for a contact.

    Derives household/family members via BFS walk of relationships
    (spouse, child, parent, sibling, etc.). Returns names and ages.
    """
    members = get_household_members(
        session=session,
        contact_id=str(contact_id),
        current_user=current_user,
    )
    return {"data": members}
