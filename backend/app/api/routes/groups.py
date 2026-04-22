"""Group management routes."""

import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.crud import create_group
from app.models import Group, GroupCreate, GroupPublic, GroupsPublic, GroupUpdate

router = APIRouter(prefix="/groups", tags=["groups"])


@router.get("/", response_model=GroupsPublic)
def list_groups(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """List all groups for the current user."""
    statement = (
        select(Group).where(Group.owner_id == current_user.id).offset(skip).limit(limit)
    )
    groups = session.exec(statement).all()

    count_statement = select(func.count(Group.id)).where(
        Group.owner_id == current_user.id
    )
    count = session.exec(count_statement).one()

    return GroupsPublic(
        data=[GroupPublic.model_validate(g) for g in groups],
        count=count,
    )


@router.post("/", response_model=GroupPublic)
def create_group_route(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    group_in: GroupCreate,
) -> Any:
    """Create a new group."""
    group = create_group(session=session, group_in=group_in, owner_id=current_user.id)
    return GroupPublic.model_validate(group)


@router.patch("/{group_id}", response_model=GroupPublic)
def update_group(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    group_id: uuid.UUID,
    group_in: GroupUpdate,
) -> Any:
    """Update a group."""
    group = session.get(Group, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if group.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    update_data = group_in.model_dump(exclude_unset=True)
    group.sqlmodel_update(update_data)
    session.add(group)
    session.commit()
    session.refresh(group)
    return GroupPublic.model_validate(group)


@router.delete("/{group_id}")
def delete_group(
    session: SessionDep,
    current_user: CurrentUser,
    group_id: uuid.UUID,
) -> Any:
    """Delete a group."""
    group = session.get(Group, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if group.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    session.delete(group)
    session.commit()
    return {"ok": True}
