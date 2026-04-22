"""Relationship management routes."""

import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.crud import create_relationship
from app.models import (
    Contact,
    Relationship,
    RelationshipCreate,
    RelationshipPublic,
    RelationshipUpdate,
)

router = APIRouter(prefix="/relationships", tags=["relationships"])


@router.get("/contact/{contact_id}")
def list_relationships(
    session: SessionDep,
    current_user: CurrentUser,
    contact_id: uuid.UUID,
) -> Any:
    """List relationships for a contact."""
    contact = session.get(Contact, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    if contact.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    statement = select(Relationship).where(Relationship.contact_id == contact_id)
    relationships = session.exec(statement).all()

    return {
        "data": [RelationshipPublic.model_validate(r) for r in relationships],
        "count": len(relationships),
    }


@router.post("/", response_model=RelationshipPublic)
def create_relationship_route(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    rel_in: RelationshipCreate,
) -> Any:
    """Create a new relationship."""
    contact = session.get(Contact, rel_in.contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    if contact.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    related = session.get(Contact, rel_in.related_contact_id)
    if not related:
        raise HTTPException(status_code=404, detail="Related contact not found")

    rel = create_relationship(session=session, relationship_in=rel_in)
    return RelationshipPublic.model_validate(rel)


@router.patch("/{rel_id}", response_model=RelationshipPublic)
def update_relationship(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    rel_id: uuid.UUID,
    rel_in: RelationshipUpdate,
) -> Any:
    """Update a relationship."""
    rel = session.get(Relationship, rel_id)
    if not rel:
        raise HTTPException(status_code=404, detail="Relationship not found")

    contact = session.get(Contact, rel.contact_id)
    if contact.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    update_data = rel_in.model_dump(exclude_unset=True)
    rel.sqlmodel_update(update_data)
    session.add(rel)
    session.commit()
    session.refresh(rel)
    return RelationshipPublic.model_validate(rel)


@router.delete("/{rel_id}")
def delete_relationship(
    session: SessionDep,
    current_user: CurrentUser,
    rel_id: uuid.UUID,
) -> Any:
    """Delete a relationship."""
    rel = session.get(Relationship, rel_id)
    if not rel:
        raise HTTPException(status_code=404, detail="Relationship not found")

    contact = session.get(Contact, rel.contact_id)
    if contact.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    session.delete(rel)
    session.commit()
    return {"ok": True}
