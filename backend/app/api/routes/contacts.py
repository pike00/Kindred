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
    Note,
    NoteMention,
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


class BulkContactFilter(BaseModel):
    """Filter criteria matching list_contacts parameters."""

    search: str | None = None
    tag_id: uuid.UUID | None = None
    is_favorite: bool | None = None
    is_archived: bool | None = None
    stage: str | None = None


class BulkContactOperation(BaseModel):
    """A single operation to apply to matching contacts."""

    # Tag operations
    add_tag_ids: list[uuid.UUID] | None = None
    remove_tag_ids: list[uuid.UUID] | None = None
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

    result = [ContactPublic.model_validate(contact) for contact in contacts]
    return ContactsPublic(data=result, count=count)


@router.get("/losing-touch", response_model=ContactsPublic)
def list_losing_touch(
    session: SessionDep,
    current_user: CurrentUser,  # noqa: ARG001
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
    current_user: CurrentUser,  # noqa: ARG001
    contact_id: uuid.UUID,
) -> ContactPublic:
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
    current_user: CurrentUser,  # noqa: ARG001
    contact_in: ContactCreate,
    background_tasks: BackgroundTasks,
) -> Any:
    """Create a new contact.

    If source_external_id is provided, uses upsert logic to update existing
    contact with same (owner_id, source, source_external_id) or create new.
    """
    from app.crud import upsert_contact

    contact = upsert_contact(
        session=session, contact_in=contact_in, owner_id=current_user.id
    )
    session.commit()

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

    # Capture old stage before any changes
    old_stage = contact.stage

    update_data = contact_in.model_dump(exclude_unset=True)
    tag_ids = update_data.pop("tag_ids", None)

    # Track stage changes via the service layer
    new_stage = update_data.get("stage", None)
    if new_stage is not None and new_stage != contact.stage:
        event_in = ContactStageEventCreate(
            contact_id=contact.id,
            from_stage=contact.stage,
            to_stage=new_stage,
            occurred_at=datetime.now(timezone.utc),
            note="Stage change via contact update",
        )
        try:
            create_stage_event(
                session=session, event_in=event_in, owner_id=current_user.id
            )
        except Exception:
            # Don't fail the whole update if event creation fails
            pass

    contact.sqlmodel_update(update_data)
    # Compute vcard_sha256 if vcard_raw was updated
    if "vcard_raw" in update_data and contact.vcard_raw:
        contact.vcard_sha256 = compute_vcard_hash(contact.vcard_raw)
    session.add(contact)

    # Log stage change if stage was updated
    new_stage = update_data.get("stage", old_stage)
    if new_stage != old_stage:
        stage_event = ContactStageEvent(
            contact_id=contact.id,
            owner_id=current_user.id,
            changed_by_id=current_user.id,
            old_stage=old_stage,
            new_stage=new_stage,
        )
        session.add(stage_event)

    # Update tag associations if provided
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
        )
    )
    contact = session.exec(statement).first()
    background_tasks.add_task(_enqueue_contact_index, contact)
    return ContactPublic.model_validate(contact)


@router.delete("/{contact_id}", response_model=Ok)
def delete_contact(
    session: SessionDep,
    current_user: CurrentUser,  # noqa: ARG001
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
    return Ok()


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
    current_user: CurrentUser,  # noqa: ARG001
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
            Note.deleted_at == None,  # noqa: E711
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
    current_user: CurrentUser,  # noqa: ARG001
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
        )
    )
    contact = session.exec(statement).first()
    background_tasks.add_task(_enqueue_contact_index, contact)
    return ContactPublic.model_validate(contact)


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
