"""Contact management routes."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from arq.connections import RedisSettings
from fastapi import (
    APIRouter,
    BackgroundTasks,
    HTTPException,
    Query,
)
from pydantic import BaseModel
from sqlalchemy.orm import selectinload
from sqlmodel import Field, SQLModel, col, func, select

from app.api.deps import CurrentUser, SessionDep
from app.core.config import settings as app_settings
from app.crud import visible_contact_ids
from app.filter_compiler import apply_filter_json
from app.models import (
    Address,
    Contact,
    ContactCreate,
    ContactField,
    ContactPublic,
    ContactSource,
    ContactsPublic,
    ContactStageEvent,
    ContactTag,
    ContactUpdate,
    Interaction,
    InteractionAttendee,
    OverdueContactsPublic,
    Relationship,
    SavedFilter,
    User,
    derive_handle_contact_field,
)
from app.vcard import compute_vcard_hash

# ─── Bulk operations models ────────────────────────────────────────────────

# Avatar upload configuration
AVATAR_UPLOAD_DIR = Path("uploads/avatars")
AVATAR_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Max file size: 10MB
MAX_AVATAR_SIZE = 10 * 1024 * 1024
ALLOWED_AVATAR_TYPES = {"image/jpeg", "image/png", "image/webp"}


class AvatarUploadResponse(SQLModel):
    """Response model for avatar upload."""

    avatar_url: str
    message: str = "Avatar uploaded successfully"


# ─── Bulk operation models ────────────────────────────────────────────────────


class BulkOperations(SQLModel):
    set_is_favorite: bool | None = None
    set_is_archived: bool | None = None
    set_stage: str | None = None
    add_tag_ids: list[uuid.UUID] | None = None
    remove_tag_ids: list[uuid.UUID] | None = None


class BulkFilters(SQLModel):
    search: str | None = None
    is_archived: bool | None = None
    is_favorite: bool | None = None
    stage: str | None = None


class BulkUpdateRequest(SQLModel):
    contact_ids: list[uuid.UUID] | None = None
    select_all_filtered: bool = False
    filters: BulkFilters | None = None
    operations: BulkOperations
    limit: int = Field(default=500, ge=1, le=2000)


class BulkUpdateResponse(SQLModel):
    updated_count: int
    skipped_count: int = 0


logger = logging.getLogger(__name__)

# ─── Bulk operations models ────────────────────────────────────────────────

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
    current_user: CurrentUser,  # noqa: ARG001
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
    saved_filter_id: uuid.UUID | None = None,
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

    # Apply saved filter if requested
    if saved_filter_id is not None:
        saved_filter = session.get(SavedFilter, saved_filter_id)
        if not saved_filter:
            raise HTTPException(status_code=404, detail="Saved filter not found")
        # Check permissions: owner or shared via tag
        if saved_filter.owner_id != current_user.id:
            if saved_filter.tag_id is None:
                raise HTTPException(status_code=403, detail="Not enough permissions")
            # Check TagShare access
            from sqlmodel import select as sql_select

            from app.models import TagShare

            share = session.exec(
                sql_select(TagShare).where(
                    TagShare.tag_id == saved_filter.tag_id,
                    TagShare.grantee_id == current_user.id,
                )
            ).first()
            if not share:
                raise HTTPException(status_code=403, detail="Not enough permissions")
        # Apply the filter_json to the statement
        statement = apply_filter_json(statement, saved_filter.filter_json)

    # Apply saved filter if requested
    if saved_filter_id is not None:
        saved_filter = session.get(SavedFilter, saved_filter_id)
        if not saved_filter:
            raise HTTPException(status_code=404, detail="Saved filter not found")
        # Check permissions: owner or shared via tag
        if saved_filter.owner_id != current_user.id:
            if saved_filter.tag_id is None:
                raise HTTPException(status_code=403, detail="Not enough permissions")
            # Check TagShare access
            from sqlmodel import select as sql_select

            from app.models import TagShare

            share = session.exec(
                sql_select(TagShare).where(
                    TagShare.tag_id == saved_filter.tag_id,
                    TagShare.grantee_id == current_user.id,
                )
            ).first()
            if not share:
                raise HTTPException(status_code=403, detail="Not enough permissions")
        # Apply the filter_json to the statement
        statement = apply_filter_json(statement, saved_filter.filter_json)

    # Count (before pagination)
    count_statement = select(func.count()).select_from(statement.subquery())
    count = session.exec(count_statement).one()

    statement = statement.options(
        selectinload(Contact.tags),
    )

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


@router.get("/losing-touch", response_model=ContactsPublic)
def list_losing_touch_contacts(
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """List contacts with a set cadence that are overdue or never contacted."""
    now = datetime.now(timezone.utc)
    contacts = session.exec(
        select(Contact).where(
            Contact.id.in_(visible_contact_ids(current_user, include_deleted=False)),
            Contact.is_archived.is_(False),
            Contact.contact_frequency_days.is_not(None),
        )
    ).all()
    losing = [
        c
        for c in contacts
        if c.last_contacted_at is None
        or (now - c.last_contacted_at).days >= c.contact_frequency_days
    ]
    return ContactsPublic(data=losing, count=len(losing))


@router.patch("/bulk", response_model=BulkUpdateResponse)
def bulk_update_contacts(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    request: BulkUpdateRequest,
) -> Any:
    """Bulk update contacts by explicit IDs or filtered selection."""
    if not request.contact_ids and not request.select_all_filtered:
        raise HTTPException(
            status_code=400,
            detail="Must provide contact_ids or set select_all_filtered=true",
        )

    stmt = select(Contact).where(
        Contact.id.in_(visible_contact_ids(current_user, include_deleted=False))
    )

    if request.contact_ids:
        stmt = stmt.where(Contact.id.in_(request.contact_ids))
    elif request.select_all_filtered and request.filters:
        f = request.filters
        if f.search:
            s = f"%{f.search}%"
            stmt = stmt.where(
                col(Contact.first_name).ilike(s)
                | col(Contact.last_name).ilike(s)
                | col(Contact.nickname).ilike(s)
                | col(Contact.company).ilike(s)
            )
        if f.is_archived is not None:
            stmt = stmt.where(Contact.is_archived == f.is_archived)
        if f.is_favorite is not None:
            stmt = stmt.where(Contact.is_favorite == f.is_favorite)
        if f.stage is not None:
            stmt = stmt.where(Contact.stage == f.stage)

    stmt = stmt.limit(request.limit)
    contacts = session.exec(stmt).all()

    ops = request.operations
    updated = 0
    for contact in contacts:
        changed = False
        if ops.set_is_favorite is not None:
            contact.is_favorite = ops.set_is_favorite
            changed = True
        if ops.set_is_archived is not None:
            contact.is_archived = ops.set_is_archived
            changed = True
        if ops.set_stage is not None:
            contact.stage = ops.set_stage
            changed = True
        if ops.add_tag_ids:
            for tag_id in ops.add_tag_ids:
                existing = session.exec(
                    select(ContactTag).where(
                        ContactTag.contact_id == contact.id,
                        ContactTag.tag_id == tag_id,
                    )
                ).first()
                if not existing:
                    session.add(ContactTag(contact_id=contact.id, tag_id=tag_id))
            changed = True
        if ops.remove_tag_ids:
            for tag_id in ops.remove_tag_ids:
                link = session.exec(
                    select(ContactTag).where(
                        ContactTag.contact_id == contact.id,
                        ContactTag.tag_id == tag_id,
                    )
                ).first()
                if link:
                    session.delete(link)
            changed = True
        if changed:
            session.add(contact)
            updated += 1

    session.commit()
    return BulkUpdateResponse(
        updated_count=updated, skipped_count=len(contacts) - updated
    )


@router.post("/", response_model=ContactPublic)
def create_contact(
    *,
    session: SessionDep,
    current_user: CurrentUser,  # noqa: ARG001
    contact_in: ContactCreate,
    background_tasks: BackgroundTasks,
) -> Any:
    """Create a new contact."""
    create_data = contact_in.model_dump(exclude_unset=True)
    tag_ids = create_data.pop("tag_ids", None)
    contact = Contact.model_validate(contact_in, update={"owner_id": current_user.id})
    session.add(contact)
    session.flush()
    if tag_ids:
        for tag_id in tag_ids:
            existing = session.exec(
                select(ContactTag).where(
                    ContactTag.contact_id == contact.id,
                    ContactTag.tag_id == tag_id,
                )
            ).first()
            if not existing:
                session.add(ContactTag(contact_id=contact.id, tag_id=tag_id))
    session.commit()
    session.refresh(contact)
    background_tasks.add_task(_enqueue_contact_index, contact)
    return contact


class ContactGeoPoint(BaseModel):
    """A geo point representing a contact's address."""

    contact_id: uuid.UUID
    contact_name: str
    avatar_url: str | None = None
    latitude: float
    longitude: float
    address_label: str
    city: str | None = None
    country: str | None = None
    street: str | None = None


class ContactsGeoResponse(BaseModel):
    """Response model for geo endpoint."""

    points: list[ContactGeoPoint]
    count: int


# NOTE: This literal-path route MUST be declared before "/{contact_id}" below,
# otherwise FastAPI matches "geo" as a contact_id UUID and returns 422.
@router.get("/geo", response_model=ContactsGeoResponse)
def list_contacts_geo(
    session: SessionDep,
    current_user: CurrentUser,
    min_lat: float | None = Query(
        default=None, description="Minimum latitude for bounding box filter"
    ),
    max_lat: float | None = Query(
        default=None, description="Maximum latitude for bounding box filter"
    ),
    min_lng: float | None = Query(
        default=None, description="Minimum longitude for bounding box filter"
    ),
    max_lng: float | None = Query(
        default=None, description="Maximum longitude for bounding box filter"
    ),
) -> Any:
    """List contacts with geographic coordinates for map visualization.

    Returns contacts that have addresses with valid latitude/longitude.
    Supports optional bounding box filtering.
    Respects tag-share visibility rules.
    """
    # Get visible contact IDs (owned + shared via tag shares)
    visible_ids = visible_contact_ids(current_user, include_deleted=False)

    # Build query joining Contact -> Address where address has coordinates
    statement = (
        select(Contact, Address)
        .join(Address, Contact.id == Address.contact_id)
        .where(
            Contact.id.in_(visible_ids),
            Address.latitude.is_not(None),
            Address.longitude.is_not(None),
        )
    )

    # Apply bounding box filter if provided
    if all(v is not None for v in [min_lat, max_lat, min_lng, max_lng]):
        statement = statement.where(
            Address.latitude >= min_lat,
            Address.latitude <= max_lat,
            Address.longitude >= min_lng,
            Address.longitude <= max_lng,
        )

    results = session.exec(statement).all()

    points = []
    seen = set()  # Avoid duplicate contacts (multiple addresses)

    for contact, address in results:
        if contact.id in seen:
            continue
        seen.add(contact.id)

        # Build full name
        name_parts = [
            contact.first_name,
            contact.middle_name,
            contact.last_name,
        ]
        if contact.prefix:
            name_parts = [contact.prefix] + name_parts
        if contact.suffix:
            name_parts.append(contact.suffix)
        full_name = " ".join(p for p in name_parts if p).strip() or "Unnamed contact"

        points.append(
            ContactGeoPoint(
                contact_id=contact.id,
                contact_name=full_name,
                avatar_url=contact.avatar_url,
                latitude=address.latitude,
                longitude=address.longitude,
                address_label=address.label or "home",
                city=address.city,
                country=address.country,
                street=address.street,
            )
        )

    return ContactsGeoResponse(points=points, count=len(points))


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
            Contact.id.in_(visible_contact_ids(current_user, include_deleted=False)),
        )
        .options(selectinload(Contact.tags))
    ).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact


@router.post("/{contact_id}/restore", response_model=ContactPublic)
def restore_contact(
    contact_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """Restore a soft-deleted contact."""
    contact = session.exec(
        select(Contact).where(
            Contact.id == contact_id,
            Contact.owner_id == current_user.id,
        )
    ).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    if contact.deleted_at is None:
        raise HTTPException(status_code=400, detail="Contact is not deleted")
    contact.deleted_at = None
    session.add(contact)
    session.commit()
    session.refresh(contact)
    return contact


@router.patch("/{contact_id}", response_model=ContactPublic)
def update_contact(
    *,
    session: SessionDep,
    current_user: CurrentUser,  # noqa: ARG001
    contact_id: uuid.UUID,
    contact_in: ContactUpdate,
    background_tasks: BackgroundTasks,
) -> ContactPublic:
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
    tag_ids = update_data.pop("tag_ids", None)

    old_stage = contact.stage
    contact.sqlmodel_update(update_data)
    # Compute vcard_sha256 if vcard_raw was updated
    if "vcard_raw" in update_data and contact.vcard_raw:
        contact.vcard_sha256 = compute_vcard_hash(contact.vcard_raw)
    session.add(contact)

    # Sync tags if tag_ids was provided
    if tag_ids is not None:
        session.exec(select(ContactTag).where(ContactTag.contact_id == contact_id))
        existing_tags = session.exec(
            select(ContactTag).where(ContactTag.contact_id == contact_id)
        ).all()
        existing_tag_ids = {ct.tag_id for ct in existing_tags}
        new_tag_ids = set(tag_ids)
        for tid in new_tag_ids - existing_tag_ids:
            session.add(ContactTag(contact_id=contact_id, tag_id=tid))
        for tid in existing_tag_ids - new_tag_ids:
            ct = session.exec(
                select(ContactTag).where(
                    ContactTag.contact_id == contact_id,
                    ContactTag.tag_id == tid,
                )
            ).first()
            if ct:
                session.delete(ct)

    # Auto-create stage event if stage changed
    new_stage = update_data.get("stage", old_stage)
    if "stage" in update_data and new_stage != old_stage:
        stage_event = ContactStageEvent(
            contact_id=contact_id,
            owner_id=current_user.id,
            from_stage=old_stage,
            to_stage=new_stage,
            occurred_at=datetime.now(timezone.utc),
        )
        session.add(stage_event)

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


class HeatmapBucket(BaseModel):
    week_start: str
    count: int


class ContactHeatmapResponse(BaseModel):
    data: list[HeatmapBucket]


@router.get("/{contact_id}/heatmap", response_model=ContactHeatmapResponse)
def get_contact_heatmap(
    contact_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """Return 52 weekly interaction-count buckets for a contact (oldest first)."""
    contact = session.exec(
        select(Contact).where(
            Contact.id == contact_id,
            Contact.id.in_(visible_contact_ids(current_user, include_deleted=False)),
        )
    ).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    now = datetime.now(timezone.utc)
    # Start from 52 weeks ago, rounded to Monday
    start = now - timedelta(weeks=52)
    start = start - timedelta(days=start.weekday())  # back to Monday
    start = start.replace(hour=0, minute=0, second=0, microsecond=0)

    # Build 52 week buckets
    buckets: dict[str, int] = {}
    for i in range(52):
        week_start = start + timedelta(weeks=i)
        buckets[week_start.date().isoformat()] = 0

    # Count interactions per week
    stmt = (
        select(Interaction.occurred_at)
        .join(InteractionAttendee, InteractionAttendee.interaction_id == Interaction.id)
        .where(
            InteractionAttendee.contact_id == contact_id,
            Interaction.occurred_at >= start,
            Interaction.deleted_at.is_(None),
            Interaction.is_draft == False,  # noqa: E712
        )
    )
    for occurred_at in session.exec(stmt).all():
        # Normalize to UTC
        if occurred_at.tzinfo is None:
            occurred_at = occurred_at.replace(tzinfo=timezone.utc)
        # Find the Monday of that week
        week_start = occurred_at.date() - timedelta(days=occurred_at.weekday())
        key = week_start.isoformat()
        if key in buckets:
            buckets[key] += 1

    data = [HeatmapBucket(week_start=k, count=v) for k, v in sorted(buckets.items())]
    return ContactHeatmapResponse(data=data)


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
    """Get notes where this contact is mentioned."""
    from app.models import Note, NoteMention

    contact = session.exec(
        select(Contact).where(
            Contact.id == contact_id,
            Contact.id.in_(visible_contact_ids(current_user, include_deleted=False)),
        )
    ).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    rows = session.exec(
        select(NoteMention, Note, Contact)
        .join(Note, NoteMention.note_id == Note.id)
        .join(Contact, Note.contact_id == Contact.id)
        .where(NoteMention.contact_id == contact_id)
        .where(Note.deleted_at.is_(None))
        .order_by(Note.created_at.desc())
    ).all()

    return [
        _MentionPublic(
            note_id=note.id,
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


def _ensure_handle_contact_field(
    session: SessionDep, contact: Contact, handle: str | None
) -> bool:
    """Surface an iMessage handle as a dialable phone/email contact field.

    The handle is otherwise only stored in `source_external_id` / `imessage_id`,
    so it shows in the source badge but not the Contact Information card. This
    upserts a typed ContactField from it. Idempotent: no-op when a field with
    the same value already exists. The new field is primary when the contact
    has no other field of that type. Returns True when a field was created.
    """
    derived = derive_handle_contact_field(handle)
    if derived is None:
        return False
    field_type, value = derived

    same_value = session.exec(
        select(ContactField).where(
            ContactField.contact_id == contact.id,
            ContactField.value == value,
        )
    ).first()
    if same_value is not None:
        return False

    has_same_type = session.exec(
        select(ContactField).where(
            ContactField.contact_id == contact.id,
            ContactField.field_type == field_type,
        )
    ).first()
    session.add(
        ContactField(
            contact_id=contact.id,
            field_type=field_type,
            label="iMessage",
            value=value,
            is_primary=has_same_type is None,
        )
    )
    return True


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
                _ensure_handle_contact_field(session, existing, profile.imessage_id)
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
                # Flush so the contact row (and its id) exists before the
                # contact field references it via FK.
                session.flush()
                _ensure_handle_contact_field(session, new_contact, profile.imessage_id)
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
