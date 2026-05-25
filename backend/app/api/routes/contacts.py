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
    File,
    HTTPException,
    Query,
    UploadFile,
)
from pydantic import BaseModel
from sqlalchemy.orm import selectinload
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, SessionDep
from app.core.config import settings as app_settings
from app.crud import visible_contact_ids
from app.household import get_household_members
from app.models import (
    Address,
    Contact,
    ContactCreate,
    ContactPublic,
    ContactSource,
    ContactsPublic,
    ContactStageEvent,
    ContactTag,
    ContactUpdate,
    JournalEntry,
    JournalEntryContact,
    JournalEntryPublic,
    OverdueContactsPublic,
    User,
)
from app.vcard import compute_vcard_hash

# Avatar upload configuration
AVATAR_UPLOAD_DIR = Path("uploads/avatars")
AVATAR_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Max file size: 10MB
MAX_AVATAR_SIZE = 10 * 1024 * 1024
ALLOWED_AVATAR_TYPES = {"image/jpeg", "image/png", "image/webp"}

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/contacts", tags=["contacts"])


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


@router.post("/", response_model=ContactPublic)
def create_contact(
    *,
    session: SessionDep,
    current_user: CurrentUser,  # noqa: ARG001
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


class _MentionPublic(SQLModel):
    note_id: uuid.UUID
    note_body: str
    note_created_at: datetime
    source_contact: ContactPublic


@router.get("/{contact_id}/mentions", response_model=list[_MentionPublic])
def list_contact_mentions(
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
