import uuid
from datetime import datetime

import sqlalchemy as sa
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Address,
    Contact,
    ContactField,
    ContactTag,
    Debt,
    Gift,
    InteractionAttendee,
    LifeEvent,
    MediaRecommendation,
    Note,
    Pet,
    Relationship,
    Reminder,
    Tag,
    TagShare,
    TagSharePublic,
    TagSharesPublic,
    User,
)

router = APIRouter(prefix="/tag-shares", tags=["tag-shares"])


class SharePreviewEntity(BaseModel):
    """Preview counts for a single entity type."""
    entity_type: str
    count: int


class TagSharePreview(BaseModel):
    """Preview of what will be shared when granting access to a tag."""
    tag_id: uuid.UUID
    tag_name: str
    contact_count: int
    sample_contacts: list[str]  # First 3 contact names
    entities: list[SharePreviewEntity]
    total_related_rows: int


@router.get("/preview/{tag_id}", response_model=TagSharePreview)
def preview_tag_share(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    tag_id: uuid.UUID,
) -> TagSharePreview:
    """Preview the scope of sharing a tag - counts of all related entities."""
    tag = session.get(Tag, tag_id)
    if not tag or tag.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Tag not found")

    # Get all contact IDs that have this tag
    contact_ids_stmt = select(ContactTag.contact_id).where(ContactTag.tag_id == tag_id)
    contact_ids = list(session.exec(contact_ids_stmt).all())

    if not contact_ids:
        return TagSharePreview(
            tag_id=tag.id,
            tag_name=tag.name,
            contact_count=0,
            sample_contacts=[],
            entities=[],
            total_related_rows=0,
        )

    # Get sample contact names (first 3)
    sample_contacts_stmt = (
        select(Contact)
        .where(Contact.id.in_(contact_ids))
        .limit(3)
    )
    sample_contacts = session.exec(sample_contacts_stmt).all()
    sample_names = [
        f"{c.first_name} {c.last_name or ''}".strip() for c in sample_contacts
    ]

    # Count related entities
    entities = []
    total_related = 0

    # Contacts (the contacts themselves with this tag)
    entities.append(SharePreviewEntity(entity_type="Contact", count=len(contact_ids)))

    # Interactions via interaction_attendee
    interaction_count = session.exec(
        select(func.count(func.distinct(InteractionAttendee.interaction_id))).where(
            InteractionAttendee.contact_id.in_(contact_ids)
        )
    ).one()
    entities.append(
        SharePreviewEntity(entity_type="Interaction", count=interaction_count)
    )
    total_related += interaction_count

    # Notes
    note_count = session.exec(
        select(func.count(Note.id)).where(Note.contact_id.in_(contact_ids))
    ).one()
    entities.append(SharePreviewEntity(entity_type="Note", count=note_count))
    total_related += note_count

    # ContactFields
    cf_count = session.exec(
        select(func.count(ContactField.id)).where(
            ContactField.contact_id.in_(contact_ids)
        )
    ).one()
    entities.append(SharePreviewEntity(entity_type="ContactField", count=cf_count))
    total_related += cf_count

    # Addresses
    addr_count = session.exec(
        select(func.count(Address.id)).where(Address.contact_id.in_(contact_ids))
    ).one()
    entities.append(SharePreviewEntity(entity_type="Address", count=addr_count))
    total_related += addr_count

    # Gifts
    gift_count = session.exec(
        select(func.count(Gift.id)).where(Gift.contact_id.in_(contact_ids))
    ).one()
    entities.append(SharePreviewEntity(entity_type="Gift", count=gift_count))
    total_related += gift_count

    # Debts
    debt_count = session.exec(
        select(func.count(Debt.id)).where(Debt.contact_id.in_(contact_ids))
    ).one()
    entities.append(SharePreviewEntity(entity_type="Debt", count=debt_count))
    total_related += debt_count

    # Reminders
    reminder_count = session.exec(
        select(func.count(Reminder.id)).where(Reminder.contact_id.in_(contact_ids))
    ).one()
    entities.append(
        SharePreviewEntity(entity_type="Reminder", count=reminder_count)
    )
    total_related += reminder_count

    # LifeEvents
    le_count = session.exec(
        select(func.count(LifeEvent.id)).where(LifeEvent.contact_id.in_(contact_ids))
    ).one()
    entities.append(SharePreviewEntity(entity_type="LifeEvent", count=le_count))
    total_related += le_count

    # MediaRecommendations
    mr_count = session.exec(
        select(func.count(MediaRecommendation.id)).where(
            MediaRecommendation.contact_id.in_(contact_ids)
        )
    ).one()
    entities.append(
        SharePreviewEntity(entity_type="MediaRecommendation", count=mr_count)
    )
    total_related += mr_count

    # Relationships where contact_id is the tagged contact
    rel_count = session.exec(
        select(func.count(Relationship.id)).where(
            Relationship.contact_id.in_(contact_ids)
        )
    ).one()
    entities.append(
        SharePreviewEntity(entity_type="Relationship", count=rel_count)
    )
    total_related += rel_count

    # Pets
    pet_count = session.exec(
        select(func.count(Pet.id)).where(Pet.contact_id.in_(contact_ids))
    ).one()
    entities.append(SharePreviewEntity(entity_type="Pet", count=pet_count))
    total_related += pet_count

    return TagSharePreview(
        tag_id=tag.id,
        tag_name=tag.name,
        contact_count=len(contact_ids),
        sample_contacts=sample_names,
        entities=entities,
        total_related_rows=total_related,
    )


class _ShareIn(BaseModel):
    tag_id: uuid.UUID
    grantee_id: uuid.UUID


@router.post("/", response_model=TagSharePublic)
def create_tag_share(
    *, session: SessionDep, current_user: CurrentUser, body: _ShareIn
) -> TagSharePublic:
    tag = session.get(Tag, body.tag_id)
    if not tag or tag.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Tag not found")
    grantee = session.get(User, body.grantee_id)
    if not grantee or not grantee.is_active:
        raise HTTPException(status_code=404, detail="Grantee not found")
    existing = session.get(TagShare, (body.tag_id, body.grantee_id))
    if existing:
        return TagSharePublic(
            tag_id=existing.tag_id,
            grantee_id=existing.grantee_id,
            grantee_email=grantee.email,
            created_at=existing.created_at,
        )
    share = TagShare(tag_id=body.tag_id, grantee_id=body.grantee_id)
    session.add(share)
    session.commit()
    session.refresh(share)
    return TagSharePublic(
        tag_id=share.tag_id,
        grantee_id=share.grantee_id,
        grantee_email=grantee.email,
        created_at=share.created_at,
    )


@router.get("/", response_model=TagSharesPublic)
def list_tag_shares(
    *, session: SessionDep, current_user: CurrentUser, tag_id: uuid.UUID
) -> TagSharesPublic:
    tag = session.get(Tag, tag_id)
    if not tag or tag.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Tag not found")
    rows = session.exec(
        select(TagShare, User)
        .join(User, User.id == TagShare.grantee_id)
        .where(TagShare.tag_id == tag_id)
    ).all()
    data = [
        TagSharePublic(
            tag_id=s.tag_id,
            grantee_id=s.grantee_id,
            grantee_email=u.email,
            created_at=s.created_at,
        )
        for s, u in rows
    ]
    return TagSharesPublic(data=data, count=len(data))


@router.delete("/{tag_id}/{grantee_id}")
def delete_tag_share(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    tag_id: uuid.UUID,
    grantee_id: uuid.UUID,
) -> dict[str, str]:
    tag = session.get(Tag, tag_id)
    if not tag or tag.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Tag not found")
    share = session.get(TagShare, (tag_id, grantee_id))
    if not share:
        raise HTTPException(status_code=404, detail="Share not found")
    session.delete(share)
    session.commit()
    return {"message": "Share removed"}


@router.post("/{tag_id}/{grantee_id}/audit")
def log_tag_share_audit(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    tag_id: uuid.UUID,
    grantee_id: uuid.UUID,
) -> dict[str, str]:
    """Log an audit entry for tag share creation."""
    tag = session.get(Tag, tag_id)
    if not tag or tag.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Tag not found")

    grantee = session.get(User, grantee_id)
    if not grantee:
        raise HTTPException(status_code=404, detail="Grantee not found")

    # Log to activity log
    from app.models import ActivityLog

    log = ActivityLog(
        owner_id=current_user.id,
        actor_id=current_user.id,
        entity_type="TagShare",
        entity_id=tag_id,
        action="create",
        changes_json={
            "grantee_email": grantee.email,
            "grantee_id": str(grantee_id),
            "tag_name": tag.name,
        },
    )
    session.add(log)
    session.commit()

    return {"message": "Audit logged"}
