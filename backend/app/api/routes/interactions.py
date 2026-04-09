"""Interaction management routes."""

import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.crud import create_interaction
from app.models import (
    Contact,
    Interaction,
    InteractionCreate,
    InteractionPublic,
    InteractionUpdate,
    InteractionsPublic,
)

router = APIRouter(prefix="/interactions", tags=["interactions"])


@router.get("/", response_model=InteractionsPublic)
def list_interactions(
    session: SessionDep,
    current_user: CurrentUser,
    contact_id: uuid.UUID | None = None,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """List interactions (global or per-contact)."""
    statement = select(Interaction).where(Interaction.owner_id == current_user.id)

    if contact_id:
        contact = session.get(Contact, contact_id)
        if not contact:
            raise HTTPException(status_code=404, detail="Contact not found")
        if contact.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not enough permissions")

        statement = statement.where(Interaction.contact_id == contact_id)

    # Count
    count_statement = select(func.count()).select_from(statement.subquery())
    count = session.exec(count_statement).one()

    # Order and paginate
    statement = statement.order_by(Interaction.occurred_at.desc()).offset(skip).limit(limit)
    interactions = session.exec(statement).all()

    return InteractionsPublic(
        data=[InteractionPublic.model_validate(i) for i in interactions],
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
    contact = session.get(Contact, interaction_in.contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    if contact.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    interaction = create_interaction(
        session=session, interaction_in=interaction_in, owner_id=current_user.id
    )
    return InteractionPublic.model_validate(interaction)


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
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    if interaction.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    update_data = interaction_in.model_dump(exclude_unset=True)
    interaction.sqlmodel_update(update_data)
    session.add(interaction)
    session.commit()
    session.refresh(interaction)
    return InteractionPublic.model_validate(interaction)


@router.delete("/{interaction_id}")
def delete_interaction(
    session: SessionDep,
    current_user: CurrentUser,
    interaction_id: uuid.UUID,
) -> Any:
    """Delete an interaction."""
    interaction = session.get(Interaction, interaction_id)
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    if interaction.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    session.delete(interaction)
    session.commit()
    return {"ok": True}
