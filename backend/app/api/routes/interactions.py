"""Interaction management routes."""

import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.crud import create_interaction, visible_contact_ids
from app.models import (
    Contact,
    Interaction,
    InteractionCreate,
    InteractionPublic,
    InteractionUpdate,
    InteractionsPublic,
)

router = APIRouter(prefix="/interactions", tags=["interactions"])


def _interaction_to_public(
    interaction: Interaction, contact: Contact | None
) -> InteractionPublic:
    """Build an InteractionPublic with denormalized contact fields."""
    return InteractionPublic(
        **InteractionPublic.model_validate(interaction).model_dump(
            exclude={"contact_first_name", "contact_last_name", "contact_avatar_url"}
        ),
        contact_first_name=contact.first_name if contact else None,
        contact_last_name=contact.last_name if contact else None,
        contact_avatar_url=contact.avatar_url if contact else None,
    )


@router.get("/", response_model=InteractionsPublic)
def list_interactions(
    session: SessionDep,
    current_user: CurrentUser,
    contact_id: uuid.UUID | None = None,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """List interactions (global or per-contact)."""
    visible = visible_contact_ids(current_user)
    statement = select(Interaction).where(Interaction.contact_id.in_(visible))

    if contact_id:
        check_stmt = select(Contact.id).where(
            Contact.id == contact_id, Contact.id.in_(visible)
        )
        if session.exec(check_stmt).first() is None:
            raise HTTPException(status_code=404, detail="Contact not found")

        statement = statement.where(Interaction.contact_id == contact_id)

    # Count
    count_statement = select(func.count()).select_from(statement.subquery())
    count = session.exec(count_statement).one()

    # Order and paginate
    statement = statement.order_by(Interaction.occurred_at.desc()).offset(skip).limit(limit)
    interactions = session.exec(statement).all()

    contact_ids = {i.contact_id for i in interactions}
    contact_map: dict[uuid.UUID, Contact] = {}
    if contact_ids:
        contacts = session.exec(
            select(Contact).where(Contact.id.in_(contact_ids))
        ).all()
        contact_map = {c.id: c for c in contacts}

    return InteractionsPublic(
        data=[
            _interaction_to_public(i, contact_map.get(i.contact_id))
            for i in interactions
        ],
        count=count,
    )


@router.post("/", response_model=InteractionPublic)
def create_interaction_route(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    interaction_in: InteractionCreate,
) -> Any:
    """Create a new interaction."""
    visible = visible_contact_ids(current_user)
    check_stmt = select(Contact.id).where(
        Contact.id == interaction_in.contact_id, Contact.id.in_(visible)
    )
    if session.exec(check_stmt).first() is None:
        raise HTTPException(status_code=404, detail="Contact not found")

    interaction = create_interaction(
        session=session, interaction_in=interaction_in, owner_id=current_user.id
    )
    contact = session.get(Contact, interaction.contact_id)
    return _interaction_to_public(interaction, contact)


@router.patch("/{interaction_id}", response_model=InteractionPublic)
def update_interaction(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    interaction_id: uuid.UUID,
    interaction_in: InteractionUpdate,
) -> Any:
    """Update an interaction."""
    interaction = session.get(Interaction, interaction_id)
    if interaction is None:
        raise HTTPException(status_code=404, detail="Interaction not found")
    check_stmt = select(Contact.id).where(
        Contact.id == interaction.contact_id,
        Contact.id.in_(visible_contact_ids(current_user)),
    )
    if session.exec(check_stmt).first() is None:
        raise HTTPException(status_code=404, detail="Interaction not found")

    update_data = interaction_in.model_dump(exclude_unset=True)
    interaction.sqlmodel_update(update_data)
    session.add(interaction)
    session.commit()
    session.refresh(interaction)
    contact = session.get(Contact, interaction.contact_id)
    return _interaction_to_public(interaction, contact)


@router.delete("/{interaction_id}")
def delete_interaction(
    session: SessionDep,
    current_user: CurrentUser,
    interaction_id: uuid.UUID,
) -> Any:
    """Delete an interaction."""
    interaction = session.get(Interaction, interaction_id)
    if interaction is None:
        raise HTTPException(status_code=404, detail="Interaction not found")
    check_stmt = select(Contact.id).where(
        Contact.id == interaction.contact_id,
        Contact.id.in_(visible_contact_ids(current_user)),
    )
    if session.exec(check_stmt).first() is None:
        raise HTTPException(status_code=404, detail="Interaction not found")

    session.delete(interaction)
    session.commit()
    return {"ok": True}
