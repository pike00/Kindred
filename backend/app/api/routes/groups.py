"""Group management routes."""

import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Contact,
    ContactGroup,
    ContactPublic,
    Group,
    GroupCreate,
    GroupPublic,
    GroupsPublic,
    GroupUpdate,
    Ok,
)

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

    count = session.exec(
        select(func.count(Group.id)).where(Group.owner_id == current_user.id)
    ).one()

    return GroupsPublic(
        data=[GroupPublic.model_validate(g) for g in groups],
        count=count,
    )


@router.post("/", response_model=GroupPublic)
def create_group(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    group_in: GroupCreate,
) -> Any:
    """Create a new group."""
    group = Group.model_validate(group_in, update={"owner_id": current_user.id})
    session.add(group)
    session.commit()
    session.refresh(group)
    return GroupPublic.model_validate(group)


@router.get("/{group_id}", response_model=GroupPublic)
def get_group(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    group_id: uuid.UUID,
) -> Any:
    """Get a specific group."""
    group = session.get(Group, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if group.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
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


@router.delete("/{group_id}", response_model=Ok)
def delete_group(
    session: SessionDep,
    current_user: CurrentUser,
    group_id: uuid.UUID,
) -> Ok:
    """Delete a group."""
    group = session.get(Group, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if group.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    session.delete(group)
    session.commit()
    return Ok()


@router.get("/{group_id}/contacts", response_model=list[ContactPublic])
def list_group_contacts(
    session: SessionDep,
    current_user: CurrentUser,
    group_id: uuid.UUID,
) -> Any:
    """List contacts in a group."""
    group = session.get(Group, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if group.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    statement = (
        select(Contact)
        .join(ContactGroup, ContactGroup.contact_id == Contact.id)
        .where(ContactGroup.group_id == group_id)
    )
    contacts = session.exec(statement).all()
    return [ContactPublic.model_validate(c) for c in contacts]


@router.post("/{group_id}/contacts/{contact_id}", response_model=Ok)
def add_contact_to_group(
    session: SessionDep,
    current_user: CurrentUser,
    group_id: uuid.UUID,
    contact_id: uuid.UUID,
) -> Ok:
    """Add a contact to a group."""
    group = session.get(Group, group_id)
    if not group or group.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Group not found")

    contact = session.get(Contact, contact_id)
    if not contact or contact.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Contact not found")

    existing = session.exec(
        select(ContactGroup).where(
            ContactGroup.group_id == group_id,
            ContactGroup.contact_id == contact_id,
        )
    ).first()
    if not existing:
        link = ContactGroup(group_id=group_id, contact_id=contact_id)
        session.add(link)
        session.commit()

    return Ok()


@router.delete("/{group_id}/contacts/{contact_id}", response_model=Ok)
def remove_contact_from_group(
    session: SessionDep,
    current_user: CurrentUser,
    group_id: uuid.UUID,
    contact_id: uuid.UUID,
) -> Ok:
    """Remove a contact from a group."""
    group = session.get(Group, group_id)
    if not group or group.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Group not found")

    link = session.exec(
        select(ContactGroup).where(
            ContactGroup.group_id == group_id,
            ContactGroup.contact_id == contact_id,
        )
    ).first()
    if link:
        session.delete(link)
        session.commit()

    return Ok()
