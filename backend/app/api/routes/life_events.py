"""Life event management routes."""

import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.crud import contact_visible, create_life_event
from app.models import (
    LifeEvent,
    LifeEventCreate,
    LifeEventPublic,
    LifeEventsPublic,
    LifeEventUpdate,
)

router = APIRouter(prefix="/life-events", tags=["life-events"])


def _require_contact_visible(session: Any, user: Any, contact_id: uuid.UUID) -> None:
    if not contact_visible(session=session, user=user, contact_id=contact_id):
        raise HTTPException(status_code=404, detail="Contact not found")


@router.get("/contact/{contact_id}", response_model=LifeEventsPublic)
def list_life_events(
    session: SessionDep,
    current_user: CurrentUser,
    contact_id: uuid.UUID,
) -> Any:
    """List life events for a contact."""
    _require_contact_visible(session, current_user, contact_id)

    statement = select(LifeEvent).where(LifeEvent.contact_id == contact_id)
    events = session.exec(statement).all()

    return LifeEventsPublic(
        data=[LifeEventPublic.model_validate(e) for e in events],
        count=len(events),
    )


@router.post("/", response_model=LifeEventPublic)
def create_life_event_route(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    event_in: LifeEventCreate,
) -> Any:
    """Create a new life event."""
    _require_contact_visible(session, current_user, event_in.contact_id)

    event = create_life_event(
        session=session, life_event_in=event_in, owner_id=current_user.id
    )
    return LifeEventPublic.model_validate(event)


@router.patch("/{event_id}", response_model=LifeEventPublic)
def update_life_event(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    event_id: uuid.UUID,
    event_in: LifeEventUpdate,
) -> Any:
    """Update a life event."""
    event = session.get(LifeEvent, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Life event not found")
    _require_contact_visible(session, current_user, event.contact_id)

    update_data = event_in.model_dump(exclude_unset=True)
    event.sqlmodel_update(update_data)
    session.add(event)
    session.commit()
    session.refresh(event)
    return LifeEventPublic.model_validate(event)


@router.delete("/{event_id}")
def delete_life_event(
    session: SessionDep,
    current_user: CurrentUser,
    event_id: uuid.UUID,
) -> Any:
    """Delete a life event."""
    event = session.get(LifeEvent, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Life event not found")
    _require_contact_visible(session, current_user, event.contact_id)

    session.delete(event)
    session.commit()
    return {"ok": True}
