"""Relationship management routes."""

import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Contact,
    Relationship,
    RelationshipCreate,
    RelationshipPublic,
    RelationshipUpdate,
)
from app.relationship_inverses import infer_inverse

router = APIRouter(prefix="/relationships", tags=["relationships"])


@router.get("/inverse")
def lookup_inverse(
    _current_user: CurrentUser,
    type: str = Query(..., min_length=1, max_length=100),
) -> dict[str, str | None]:
    """Return the inferred inverse for a relationship type, or null.

    The frontend calls this before saving to decide whether to prompt
    the user for the inverse. Symmetric types ("friend") return
    themselves; asymmetric pairs ("parent") return their counterpart
    ("child"); unknown types return null so the UI can ask.
    """
    return {"inverse": infer_inverse(type)}


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
    """Create a relationship plus its inverse so both contacts stay symmetric."""
    contact = session.get(Contact, rel_in.contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    if contact.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    related = session.get(Contact, rel_in.related_contact_id)
    if not related:
        raise HTTPException(status_code=404, detail="Related contact not found")
    if related.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    inverse_type = (rel_in.inverse_relationship_type or "").strip() or infer_inverse(
        rel_in.relationship_type
    )
    if not inverse_type:
        raise HTTPException(
            status_code=422,
            detail=(
                "Inverse relationship type required: "
                f'"{rel_in.relationship_type}" is not a known symmetric or '
                "asymmetric type. Pass inverse_relationship_type explicitly."
            ),
        )

    rel = create_relationship_idempotent(
        session=session, relationship_in=rel_in, inverse_type=inverse_type
    )
    return RelationshipPublic.model_validate(rel)


@router.patch("/{rel_id}", response_model=RelationshipPublic)
def update_relationship(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    rel_id: uuid.UUID,
    rel_in: RelationshipUpdate,
) -> Any:
    """Update a relationship.

    Only the row addressed by ``rel_id`` is touched; the paired
    inverse row is left as-is so asymmetric pairs (parent/child) can
    diverge intentionally. Edit each side from its own contact page
    if you want them to stay matched.
    """
    rel = session.get(Relationship, rel_id)
    if not rel:
        raise HTTPException(status_code=404, detail="Relationship not found")

    contact = session.get(Contact, rel.contact_id)
    if contact.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    update_data = rel_in.model_dump(exclude_unset=True)
    from app.crud_relationship import update_relationship_with_inverse

    rel = update_relationship_with_inverse(session=session, rel=rel, rel_in=rel_in)
    return RelationshipPublic.model_validate(rel)


@router.delete("/{rel_id}")
def delete_relationship(
    session: SessionDep,
    current_user: CurrentUser,
    rel_id: uuid.UUID,
) -> Any:
    """Delete a relationship and its paired inverse row."""
    rel = session.get(Relationship, rel_id)
    if not rel:
        raise HTTPException(status_code=404, detail="Relationship not found")

    contact = session.get(Contact, rel.contact_id)
    if contact.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    inverse = session.get(Relationship, rel.inverse_id) if rel.inverse_id else None
    session.delete(rel)
    if inverse is not None:
        session.delete(inverse)
    session.commit()
    return {"ok": True}
