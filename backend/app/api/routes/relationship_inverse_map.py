"""Manage the inverse relationship map table."""

import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    InverseRelationshipMap,
    InverseRelationshipMapCreate,
    InverseRelationshipMapPublic,
    InverseRelationshipMapsPublic,
    InverseRelationshipMapUpdate,
)
from app.relationship_inverses import (
    get_inverse_from_db,
    infer_inverse,
    seed_inverse_map,
)

router = APIRouter(
    prefix="/relationship-inverse-map", tags=["relationship-inverse-map"]
)


@router.get("/", response_model=InverseRelationshipMapsPublic)
def list_inverse_maps(
    session: SessionDep,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, le=1000),
) -> Any:
    """List all relationship type → inverse mappings."""
    statement = select(InverseRelationshipMap).offset(skip).limit(limit)
    results = session.exec(statement).all()
    count_stmt = select(InverseRelationshipMap)
    all_results = session.exec(count_stmt).all()
    return {
        "data": [InverseRelationshipMapPublic.model_validate(r) for r in results],
        "count": len(all_results),
    }


@router.post("/", response_model=InverseRelationshipMapPublic)
def create_inverse_map(
    session: SessionDep,
    current_user: CurrentUser,
    body: InverseRelationshipMapCreate,
) -> Any:
    """Add or update a relationship type → inverse mapping."""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    existing = session.exec(
        select(InverseRelationshipMap).where(
            InverseRelationshipMap.relationship_type
            == body.relationship_type.strip().lower()
        )
    ).first()

    if existing:
        existing.inverse_type = body.inverse_type.strip().lower()
        existing.is_symmetric = body.is_symmetric
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return InverseRelationshipMapPublic.model_validate(existing)

    row = InverseRelationshipMap(
        relationship_type=body.relationship_type.strip().lower(),
        inverse_type=body.inverse_type.strip().lower(),
        is_symmetric=body.is_symmetric,
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    return InverseRelationshipMapPublic.model_validate(row)


@router.get("/{map_id}", response_model=InverseRelationshipMapPublic)
def get_inverse_map(
    session: SessionDep,
    map_id: uuid.UUID,
) -> Any:
    """Get a single mapping by ID."""
    row = session.get(InverseRelationshipMap, map_id)
    if not row:
        raise HTTPException(status_code=404, detail="Mapping not found")
    return InverseRelationshipMapPublic.model_validate(row)


@router.patch("/{map_id}", response_model=InverseRelationshipMapPublic)
def update_inverse_map(
    session: SessionDep,
    current_user: CurrentUser,
    map_id: uuid.UUID,
    body: InverseRelationshipMapUpdate,
) -> Any:
    """Update a mapping (superuser only)."""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    row = session.get(InverseRelationshipMap, map_id)
    if not row:
        raise HTTPException(status_code=404, detail="Mapping not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(row, key, value)
    session.add(row)
    session.commit()
    session.refresh(row)
    return InverseRelationshipMapPublic.model_validate(row)


@router.delete("/{map_id}")
def delete_inverse_map(
    session: SessionDep,
    current_user: CurrentUser,
    map_id: uuid.UUID,
) -> Any:
    """Delete a mapping (superuser only)."""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    row = session.get(InverseRelationshipMap, map_id)
    if not row:
        raise HTTPException(status_code=404, detail="Mapping not found")
    session.delete(row)
    session.commit()
    return {"ok": True}


@router.post("/seed")
def seed_inverse_map_endpoint(
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """(Re-)populate the map with the canonical symmetric/asymmetric pairs."""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    count = seed_inverse_map(session)
    return {"inserted": count}


@router.get("/lookup/{relationship_type}")
def lookup_inverse(
    session: SessionDep,
    relationship_type: str,
) -> Any:
    """Look up the inverse type for a given relationship type.

    Checks the database first, falls back to the Python mapping.
    """
    result = get_inverse_from_db(session, relationship_type)
    if result:
        inv_type, is_sym = result
        return {
            "relationship_type": relationship_type,
            "inverse_type": inv_type,
            "is_symmetric": is_sym,
        }

    # Fallback to Python mapping
    inv = infer_inverse(relationship_type)
    if inv:
        return {
            "relationship_type": relationship_type,
            "inverse_type": inv,
            "is_symmetric": inv == relationship_type.strip().lower(),
        }
    return {
        "relationship_type": relationship_type,
        "inverse_type": None,
        "is_symmetric": False,
    }
