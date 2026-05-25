"""API routes for vCard conflict management."""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.models import Contact
from app.models_vcard_conflict import (
    VCardConflict,
    VCardConflictPublic,
    VCardConflictsPublic,
)

router = APIRouter(prefix="/vcard-conflicts", tags=["vCard Conflicts"])


@router.get("/", response_model=VCardConflictsPublic)
def list_vcard_conflicts(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> VCardConflictsPublic:
    """List all unresolved vCard conflicts for the current user."""
    # Join with Contact to ensure we only return conflicts for this user's contacts
    stmt = (
        select(VCardConflict)
        .join(Contact, VCardConflict.contact_id == Contact.id)
        .where(
            Contact.owner_id == current_user.id,
            VCardConflict.resolved_at.is_(None),
        )
        .order_by(VCardConflict.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    conflicts = session.exec(stmt).all()

    # Also get the local vcard_raw for each conflict
    result = []
    for conflict in conflicts:
        conflict_public = VCardConflictPublic(
            id=conflict.id,
            contact_id=conflict.contact_id,
            incoming_vcard_raw=conflict.incoming_vcard_raw,
            incoming_hash=conflict.incoming_hash,
            local_hash=conflict.local_hash,
            resolved_at=conflict.resolved_at,
            resolution_type=conflict.resolution_type,
            created_at=conflict.created_at,
            local_vcard_raw=conflict.local_vcard_raw,
        )
        result.append(conflict_public)

    count_stmt = (
        select(VCardConflict)
        .join(Contact, VCardConflict.contact_id == Contact.id)
        .where(
            Contact.owner_id == current_user.id,
            VCardConflict.resolved_at.is_(None),
        )
    )
    count = len(session.exec(count_stmt).all())

    return VCardConflictsPublic(data=result, count=count)


@router.post("/{conflict_id}/resolve", response_model=VCardConflictPublic)
def resolve_vcard_conflict(
    session: SessionDep,
    current_user: CurrentUser,
    conflict_id: uuid.UUID,
    resolution_type: str,
) -> VCardConflictPublic:
    """Resolve a vCard conflict by accepting remote or keeping local.

    resolution_type must be one of: 'keep_local', 'accept_remote'
    """
    if resolution_type not in ("keep_local", "accept_remote"):
        raise HTTPException(
            status_code=400,
            detail="resolution_type must be 'keep_local' or 'accept_remote'",
        )

    # Get the conflict and verify ownership
    stmt = (
        select(VCardConflict)
        .join(Contact, VCardConflict.contact_id == Contact.id)
        .where(
            VCardConflict.id == conflict_id,
            Contact.owner_id == current_user.id,
        )
    )
    conflict = session.exec(stmt).first()
    if not conflict:
        raise HTTPException(status_code=404, detail="Conflict not found")

    if conflict.resolved_at is not None:
        raise HTTPException(status_code=400, detail="Conflict already resolved")

    # Get the contact
    contact = session.get(Contact, conflict.contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    if resolution_type == "accept_remote":
        # Update contact with incoming vCard data
        from app.vcard import vcard_to_contact_data

        parsed = vcard_to_contact_data(conflict.incoming_vcard_raw)
        contact_data = parsed["contact"]
        for key, value in contact_data.items():
            if hasattr(contact, key):
                setattr(contact, key, value)
        contact.vcard_raw = conflict.incoming_vcard_raw
        contact.vcard_sha256 = conflict.incoming_hash
        session.add(contact)

    # Mark conflict as resolved
    conflict.resolved_at = datetime.now(timezone.utc)
    conflict.resolution_type = resolution_type
    session.add(conflict)
    session.commit()
    session.refresh(conflict)

    return VCardConflictPublic(
        id=conflict.id,
        contact_id=conflict.contact_id,
        incoming_vcard_raw=conflict.incoming_vcard_raw,
        incoming_hash=conflict.incoming_hash,
        local_hash=conflict.local_hash,
        resolved_at=conflict.resolved_at,
        resolution_type=conflict.resolution_type,
        created_at=conflict.created_at,
        local_vcard_raw=conflict.local_vcard_raw,
    )


@router.delete("/{conflict_id}", status_code=204)
def delete_vcard_conflict(
    session: SessionDep,
    current_user: CurrentUser,
    conflict_id: uuid.UUID,
) -> None:
    """Delete a vCard conflict (dismiss without action)."""
    stmt = (
        select(VCardConflict)
        .join(Contact, VCardConflict.contact_id == Contact.id)
        .where(
            VCardConflict.id == conflict_id,
            Contact.owner_id == current_user.id,
        )
    )
    conflict = session.exec(stmt).first()
    if not conflict:
        raise HTTPException(status_code=404, detail="Conflict not found")

    session.delete(conflict)
    session.commit()
