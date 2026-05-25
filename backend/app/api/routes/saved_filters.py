"""Saved filter / smart list management routes."""

import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.crud import create_saved_filter, update_saved_filter
from app.models import (
    SavedFilter,
    SavedFilterCreate,
    SavedFilterPublic,
    SavedFiltersPublic,
    SavedFilterUpdate,
    Tag,
    TagShare,
)

router = APIRouter(prefix="/saved-filters", tags=["saved-filters"])

# Allowed fields for filter_json conditions — must match Contact model columns
ALLOWED_FIELDS: frozenset[str] = frozenset(
    {
        "first_name",
        "last_name",
        "company",
        "stage",
        "is_favorite",
        "is_archived",
        "birthday",
        "contact_frequency_days",
        "last_contacted_at",
        "created_at",
    }
)

# Allowed operators per field type
STRING_OPS: frozenset[str] = frozenset({"equals", "contains", "in"})
NUMBER_OPS: frozenset[str] = frozenset({"equals", "gt", "gte", "lt", "lte"})
DATE_OPS: frozenset[str] = frozenset({"equals", "before", "after"})
BOOL_OPS: frozenset[str] = frozenset({"is"})


def _validate_filter_json(filter_json: dict) -> None:
    """Validate filter_json structure and field/operator allowlists.

    Raises HTTPException 422 on invalid input.
    """
    if not isinstance(filter_json, dict):
        raise HTTPException(status_code=422, detail="filter_json must be an object")

    conditions = filter_json.get("conditions")
    if not isinstance(conditions, list) or not conditions:
        raise HTTPException(
            status_code=422, detail="filter_json.conditions must be a non-empty list"
        )

    op = filter_json.get("op", "and")
    if op not in ("and", "or"):
        raise HTTPException(
            status_code=422, detail="filter_json.op must be 'and' or 'or'"
        )

    for i, cond in enumerate(conditions):
        if not isinstance(cond, dict):
            raise HTTPException(
                status_code=422, detail=f"conditions[{i}] must be an object"
            )

        field = cond.get("field")
        if field not in ALLOWED_FIELDS:
            raise HTTPException(
                status_code=422,
                detail=f"conditions[{i}].field '{field}' is not allowed",
            )

        operator = cond.get("operator")
        if not isinstance(operator, str):
            raise HTTPException(
                status_code=422,
                detail=f"conditions[{i}].operator must be a string",
            )

        # Validate operator against field type
        if field in ("first_name", "last_name", "company", "stage"):
            if operator not in STRING_OPS:
                raise HTTPException(
                    status_code=422,
                    detail=f"conditions[{i}].operator '{operator}' not valid for string field",
                )
        elif field in ("contact_frequency_days",):
            if operator not in NUMBER_OPS:
                raise HTTPException(
                    status_code=422,
                    detail=f"conditions[{i}].operator '{operator}' not valid for number field",
                )
        elif field in ("birthday", "last_contacted_at", "created_at"):
            if operator not in DATE_OPS:
                raise HTTPException(
                    status_code=422,
                    detail=f"conditions[{i}].operator '{operator}' not valid for date field",
                )
        elif field in ("is_favorite", "is_archived"):
            if operator not in BOOL_OPS:
                raise HTTPException(
                    status_code=422,
                    detail=f"conditions[{i}].operator '{operator}' not valid for boolean field",
                )


@router.get("/", response_model=SavedFiltersPublic)
def list_saved_filters(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """List saved filters visible to the current user (owned + shared via tag)."""
    # Owned filters
    owned_stmt = select(SavedFilter).where(SavedFilter.owner_id == current_user.id)
    # Shared filters: filter's tag_id is shared with current_user via TagShare
    shared_stmt = (
        select(SavedFilter)
        .join(Tag, Tag.id == SavedFilter.tag_id)  # type: ignore[arg-type]
        .join(TagShare, TagShare.tag_id == Tag.id)  # type: ignore[arg-type]
        .where(TagShare.grantee_id == current_user.id)
    )

    # Combine: owned + shared (deduplicated)
    stmt = owned_stmt.union(shared_stmt).offset(skip).limit(limit)
    filters = session.exec(stmt).all()

    # Count
    owned_count = session.exec(
        select(func.count(SavedFilter.id)).where(
            SavedFilter.owner_id == current_user.id
        )
    ).one()
    shared_count = session.exec(
        select(func.count(SavedFilter.id))
        .join(Tag, Tag.id == SavedFilter.tag_id)  # type: ignore[arg-type]
        .join(TagShare, TagShare.tag_id == Tag.id)  # type: ignore[arg-type]
        .where(TagShare.grantee_id == current_user.id)
    ).one()
    count = owned_count + shared_count

    return SavedFiltersPublic(
        data=[SavedFilterPublic.model_validate(f) for f in filters],
        count=count,
    )


@router.post("/", response_model=SavedFilterPublic)
def create_saved_filter_route(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    filter_in: SavedFilterCreate,
) -> Any:
    """Create a new saved filter / smart list."""
    # Validate filter_json
    _validate_filter_json(filter_in.filter_json)

    # If tag_id is set, verify the tag exists and user owns it
    if filter_in.tag_id:
        tag = session.get(Tag, filter_in.tag_id)
        if not tag or tag.owner_id != current_user.id:
            raise HTTPException(status_code=404, detail="Tag not found")

    saved_filter = create_saved_filter(
        session=session, filter_in=filter_in, owner_id=current_user.id
    )
    return SavedFilterPublic.model_validate(saved_filter)


@router.patch("/{filter_id}", response_model=SavedFilterPublic)
def update_saved_filter_route(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    filter_id: uuid.UUID,
    filter_in: SavedFilterUpdate,
) -> Any:
    """Update a saved filter."""
    saved_filter = session.get(SavedFilter, filter_id)
    if not saved_filter:
        raise HTTPException(status_code=404, detail="Saved filter not found")

    # Check permissions: owner can update; shared filters are read-only
    if saved_filter.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    # Validate filter_json if provided
    if filter_in.filter_json is not None:
        _validate_filter_json(filter_in.filter_json)

    # If tag_id is being updated, verify the tag exists and user owns it
    if filter_in.tag_id is not None:
        tag = session.get(Tag, filter_in.tag_id)
        if filter_in.tag_id and (not tag or tag.owner_id != current_user.id):
            raise HTTPException(status_code=404, detail="Tag not found")

    updated = update_saved_filter(
        session=session, db_filter=saved_filter, filter_in=filter_in
    )
    return SavedFilterPublic.model_validate(updated)


@router.delete("/{filter_id}")
def delete_saved_filter_route(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    filter_id: uuid.UUID,
) -> Any:
    """Delete a saved filter."""
    saved_filter = session.get(SavedFilter, filter_id)
    if not saved_filter:
        raise HTTPException(status_code=404, detail="Saved filter not found")

    if saved_filter.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    session.delete(saved_filter)
    session.commit()
    return {"ok": True}


# Starter built-in filter templates
# (Removed - will be handled by frontend)
