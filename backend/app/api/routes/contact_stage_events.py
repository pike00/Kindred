"""Contact stage event routes (history + analytics)."""

import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.crud import (
    backfill_stage_events,
    create_stage_event,
    get_contact_stage_history,
    get_latest_stage_event,
    get_stage_duration,
)
from app.models import (
    Contact,
    ContactStageEventCreate,
    ContactStageEventPublic,
    ContactStageEventsPublic,
)

router = APIRouter(prefix="/contacts", tags=["contact-stage-events"])


@router.get("/{contact_id}/stage-history", response_model=ContactStageEventsPublic)
def list_contact_stage_history(
    session: SessionDep,
    current_user: CurrentUser,
    contact_id: uuid.UUID,
) -> Any:
    """List all stage events for a contact, newest first."""
    # Verify contact exists and is visible
    contact = session.exec(
        select(Contact).where(
            Contact.id == contact_id,
            Contact.owner_id == current_user.id,
        )
    ).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    events = get_contact_stage_history(
        session=session, contact_id=contact_id, owner_id=current_user.id
    )
    return ContactStageEventsPublic(
        data=[ContactStageEventPublic.model_validate(e) for e in events],
        count=len(events),
    )


@router.get(
    "/{contact_id}/stage-history/latest", response_model=ContactStageEventPublic
)
def get_latest_stage(
    session: SessionDep,
    current_user: CurrentUser,
    contact_id: uuid.UUID,
) -> Any:
    """Get the most recent stage event for a contact."""
    contact = session.exec(
        select(Contact).where(
            Contact.id == contact_id,
            Contact.owner_id == current_user.id,
        )
    ).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    event = get_latest_stage_event(
        session=session, contact_id=contact_id, owner_id=current_user.id
    )
    if not event:
        raise HTTPException(status_code=404, detail="No stage events found")
    return ContactStageEventPublic.model_validate(event)


@router.post("/{contact_id}/stage-events", response_model=ContactStageEventPublic)
def create_contact_stage_event(
    session: SessionDep,
    current_user: CurrentUser,
    contact_id: uuid.UUID,
    event_in: ContactStageEventCreate,
) -> Any:
    """Create a stage event (and update Contact.stage cache).

    The ``event_in`` body must include ``to_stage`` and ``occurred_at``.
    ``from_stage`` is optional (auto-populated by the service if omitted).
    """
    if event_in.contact_id != contact_id:
        raise HTTPException(status_code=400, detail="contact_id mismatch")

    # Auto-populate from_stage if not provided
    if event_in.from_stage is None:
        latest = get_latest_stage_event(
            session=session, contact_id=contact_id, owner_id=current_user.id
        )
        if latest is not None:
            event_in.from_stage = latest.to_stage
        else:
            # Fall back to the contact's current stage (for first event)
            contact = session.exec(
                select(Contact).where(Contact.id == contact_id)
            ).first()
            if contact:
                event_in.from_stage = contact.stage

    try:
        event = create_stage_event(
            session=session, event_in=event_in, owner_id=current_user.id
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e)) from e

    return ContactStageEventPublic.model_validate(event)


@router.get(
    "/{contact_id}/stage-duration/{stage}",
    response_model=list[tuple[datetime, datetime | None, float | None]],
)
def get_stage_duration_route(
    session: SessionDep,
    current_user: CurrentUser,
    contact_id: uuid.UUID,
    stage: str,
) -> Any:
    """Get dwell times for a specific stage.

    Returns a list of ``(entered_at, exited_at, duration_seconds)`` tuples.
    ``exited_at`` is ``None`` when the contact is still in that stage.
    """
    contact = session.exec(
        select(Contact).where(
            Contact.id == contact_id,
            Contact.owner_id == current_user.id,
        )
    ).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    return get_stage_duration(
        session=session, contact_id=contact_id, stage=stage, owner_id=current_user.id
    )


@router.post("/backfill-stage-events", response_model=dict[str, int])
def backfill_stage_events_route(
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """Backfill seed stage events for all contacts owned by the current user.

    Creates one event per contact using the current stage and ``created_at``.
    Idempotent: won't duplicate existing seed events.
    """
    count = backfill_stage_events(session=session, owner_id=current_user.id)
    return {"created": count}


@router.get(
    "/{contact_id}/stage-analytics",
    response_model=dict[str, list[list]],
)
def get_stage_analytics(
    session: SessionDep,
    current_user: CurrentUser,
    contact_id: uuid.UUID,
) -> Any:
    """Get aggregate dwell time per stage for a contact.

    Returns a dict keyed by stage name, where each value is a list of
    ``[entered_at, exited_at, duration_seconds]`` lists for every dwell
    in that stage. A contact may re-enter the same stage multiple times.
    """
    # Verify contact exists and is visible
    contact = session.exec(
        select(Contact).where(
            Contact.id == contact_id,
            Contact.owner_id == current_user.id,
        )
    ).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    events = get_contact_stage_history(
        session=session, contact_id=contact_id, owner_id=current_user.id
    )

    # Group durations by stage
    from collections import defaultdict

    analytics: dict[str, list[list]] = defaultdict(list)
    entered_at: dict[str, datetime | None] = {}

    for event in events:
        if event.to_stage:
            entered_at[event.to_stage] = event.occurred_at
        if event.from_stage and event.from_stage in entered_at:
            start = entered_at.pop(event.from_stage)
            if start:
                duration = (event.occurred_at - start).total_seconds()
                analytics[event.from_stage].append(
                    [start.isoformat(), event.occurred_at.isoformat(), duration]
                )

    # Handle stages still active (no exit event)
    for stage, start in entered_at.items():
        if start:
            now = datetime.now(timezone.utc)
            duration = (now - start).total_seconds()
            analytics[stage].append([start.isoformat(), None, duration])

    return dict(analytics)
