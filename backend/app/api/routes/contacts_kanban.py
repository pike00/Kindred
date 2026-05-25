"""Kanban board specific endpoints for contacts."""

import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import selectinload
from sqlmodel import col, select

from app.api.deps import CurrentUser, SessionDep
from app.crud import visible_contact_ids
from app.models import (
    Contact,
    ContactGroup,
    ContactPublic,
    ContactsPublic,
    ContactStageEvent,
    ContactStageEventPublic,
    ContactStageEventsPublic,
    ContactTag,
)

router = APIRouter(prefix="/contacts", tags=["contacts"])


@router.get("/stages/distinct", response_model=list[str])
def get_distinct_stages(
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """Return distinct stage values used by the current user's contacts."""
    statement = (
        select(Contact.stage)
        .where(
            Contact.owner_id == current_user.id,
            Contact.is_archived.is_(False),
            Contact.stage.is_not(None),
        )
        .distinct()
    )
    stages = session.exec(statement).all()
    return [s for s in stages if s is not None]


@router.get("/kanban", response_model=dict[str, ContactsPublic])
def get_kanban_board(
    session: SessionDep,
    current_user: CurrentUser,
    search: str | None = None,
    tag_id: uuid.UUID | None = None,
    group_id: uuid.UUID | None = None,
) -> Any:
    """Return contacts grouped by stage for kanban board."""
    # Get distinct stages
    stage_stmt = (
        select(Contact.stage)
        .where(
            Contact.owner_id == current_user.id,
            Contact.is_archived.is_(False),
            Contact.stage.is_not(None),
        )
        .distinct()
    )
    stages = [s for s in session.exec(stage_stmt).all() if s is not None]

    # Add default stages if no contacts have stages yet
    default_stages = ["Active", "Dormant", "Lost", "Archived"]
    if not stages:
        stages = default_stages

    result: dict[str, ContactsPublic] = {}

    for stage in stages:
        statement = (
            select(Contact)
            .where(
                Contact.id.in_(visible_contact_ids(current_user)),
                Contact.is_archived.is_(False),
                Contact.stage == stage,
            )
            .options(
                selectinload(Contact.tags),
                selectinload(Contact.groups),
            )
            .order_by(col(Contact.first_name).asc(), col(Contact.last_name).asc())
        )

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
        # Note: Need to import ContactTag

        if group_id:
            statement = statement.join(ContactGroup).where(
                ContactGroup.group_id == group_id
            )
        # Note: Need to import ContactGroup

        contacts = session.exec(statement).all()
        result[stage] = ContactsPublic(
            data=[ContactPublic.model_validate(c) for c in contacts],
            count=len(contacts),
        )

    # Add empty default stages
    for stage in default_stages:
        if stage not in result:
            result[stage] = ContactsPublic(data=[], count=0)

    return result


@router.get("/{contact_id}/stage-events", response_model=ContactStageEventsPublic)
def get_contact_stage_events(
    session: SessionDep,
    current_user: CurrentUser,
    contact_id: uuid.UUID,
) -> Any:
    """Get stage change history for a contact."""
    from app.models import Contact as ContactModel

    contact = session.get(ContactModel, contact_id)
    if not contact or contact.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Contact not found")
    if contact.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    statement = (
        select(ContactStageEvent)
        .where(ContactStageEvent.contact_id == contact_id)
        .order_by(ContactStageEvent.changed_at.desc())
    )
    events = session.exec(statement).all()
    return ContactStageEventsPublic(
        data=[ContactStageEventPublic.model_validate(e) for e in events],
        count=len(events),
    )
