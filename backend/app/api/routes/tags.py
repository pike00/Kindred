"""Tag management routes."""

import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.crud import create_tag
from app.models import Tag, TagCreate, TagPublic, TagsPublic, TagUpdate

router = APIRouter(prefix="/tags", tags=["tags"])


@router.get("/", response_model=TagsPublic)
def list_tags(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """List all tags for the current user."""
    statement = (
        select(Tag).where(Tag.owner_id == current_user.id).offset(skip).limit(limit)
    )
    tags = session.exec(statement).all()

    count_statement = select(func.count(Tag.id)).where(Tag.owner_id == current_user.id)
    count = session.exec(count_statement).one()

    return TagsPublic(
        data=[TagPublic.model_validate(t) for t in tags],
        count=count,
    )


@router.post("/", response_model=TagPublic)
def create_tag_route(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    tag_in: TagCreate,
) -> Any:
    """Create a new tag."""
    tag = create_tag(session=session, tag_in=tag_in, owner_id=current_user.id)
    return TagPublic.model_validate(tag)


@router.patch("/{tag_id}", response_model=TagPublic)
def update_tag(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    tag_id: uuid.UUID,
    tag_in: TagUpdate,
) -> Any:
    """Update a tag."""
    tag = session.get(Tag, tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    if tag.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    update_data = tag_in.model_dump(exclude_unset=True)
    tag.sqlmodel_update(update_data)
    session.add(tag)
    session.commit()
    session.refresh(tag)
    return TagPublic.model_validate(tag)


@router.delete("/{tag_id}")
def delete_tag(
    session: SessionDep,
    current_user: CurrentUser,
    tag_id: uuid.UUID,
) -> Any:
    """Delete a tag."""
    tag = session.get(Tag, tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    if tag.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    session.delete(tag)
    session.commit()
    return {"ok": True}
