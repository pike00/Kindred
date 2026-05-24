"""Interaction management routes."""

import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.crud import (
    create_interaction,
    recompute_last_contacted_at,
    visible_contact_ids,
)
from app.models import (
    Contact,
    Interaction,
    InteractionAttendee,
    InteractionAttendeeSummary,
    InteractionConfirm,
    InteractionCreate,
    InteractionPublic,
    InteractionsPublic,
    InteractionUpdate,
    Ok,
)

router = APIRouter(prefix="/interactions", tags=["interactions"])


def _attendees_for(
    session: SessionDep,
    interaction_id: uuid.UUID,
    visible_ids: set[uuid.UUID],
) -> list[InteractionAttendeeSummary]:
    """Return the viewer-visible attendees of an interaction."""
    rows = session.exec(
        select(Contact)
        .join(
            InteractionAttendee,
            InteractionAttendee.contact_id == Contact.id,  # type: ignore[arg-type]
        )
        .where(InteractionAttendee.interaction_id == interaction_id)
    ).all()
    return [
        InteractionAttendeeSummary(
            id=c.id,
            first_name=c.first_name,
            last_name=c.last_name,
            avatar_url=c.avatar_url,
        )
        for c in rows
        if c.id in visible_ids
    ]


def _interaction_to_public(
    session: SessionDep,
    interaction: Interaction,
    visible_ids: set[uuid.UUID],
) -> InteractionPublic:
    return InteractionPublic(
        **InteractionPublic.model_validate(interaction).model_dump(
            exclude={"attendees"}
        ),
        attendees=_attendees_for(session, interaction.id, visible_ids),
    )


def _resolve_visible_contact_ids(
    session: SessionDep, current_user: CurrentUser
) -> set[uuid.UUID]:
    ids = session.exec(
        select(Contact.id).where(Contact.id.in_(visible_contact_ids(current_user)))
    ).all()
    return set(ids)


@router.get("/", response_model=InteractionsPublic)
def list_interactions(
    session: SessionDep,
    current_user: CurrentUser,
    contact_id: uuid.UUID | None = None,
    skip: int = 0,
    is_draft: bool | None = None,
    limit: int = 100,
) -> InteractionsPublic:
    """List interactions. Pass ``contact_id`` to filter by attendee.

    By default, drafts are excluded. Pass ``is_draft=true`` to list only
    drafts, or ``is_draft=false`` to explicitly exclude them.
    """
    visible_ids = _resolve_visible_contact_ids(session, current_user)

    if contact_id is not None and contact_id not in visible_ids:
        raise HTTPException(status_code=404, detail="Contact not found")

    # Interactions visible to the user = any attendee is visible.
    base = (
        select(Interaction)
        .join(
            InteractionAttendee,
            InteractionAttendee.interaction_id == Interaction.id,  # type: ignore[arg-type]
        )
        .where(InteractionAttendee.contact_id.in_(visible_ids))  # type: ignore[union-attr]
        .where(Interaction.deleted_at == None)  # noqa: E711  # soft-delete filter
    )
    # Default: exclude drafts; caller can override by passing is_draft=true or is_draft=false
    if is_draft is None:
        base = base.where(Interaction.is_draft == False)  # noqa: E712
    else:
        base = base.where(Interaction.is_draft == is_draft)
    if contact_id is not None:
        base = base.where(InteractionAttendee.contact_id == contact_id)

    # Dedup: multi-attendee rows otherwise repeat.
    base = base.distinct()

    count = session.exec(select(func.count()).select_from(base.subquery())).one()

    rows = session.exec(
        base.order_by(Interaction.occurred_at.desc()).offset(skip).limit(limit)
    ).all()

    return InteractionsPublic(
        data=[_interaction_to_public(session, ix, visible_ids) for ix in rows],
        count=count,
    )


@router.post("/", response_model=InteractionPublic)
def create_interaction_route(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    interaction_in: InteractionCreate,
) -> InteractionPublic:
    """Create a new interaction with one or more attendees."""
    visible_ids = _resolve_visible_contact_ids(session, current_user)
    for attendee_id in interaction_in.attendee_ids:
        if attendee_id not in visible_ids:
            raise HTTPException(status_code=404, detail="Contact not found")

    interaction = create_interaction(
        session=session, interaction_in=interaction_in, owner_id=current_user.id
    )
    return _interaction_to_public(session, interaction, visible_ids)


@router.patch("/{interaction_id}", response_model=InteractionPublic)
def update_interaction(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    interaction_id: uuid.UUID,
    interaction_in: InteractionUpdate,
) -> InteractionPublic:
    """Update an interaction; ``attendee_ids`` replaces the attendee set."""
    interaction = session.get(Interaction, interaction_id)
    if interaction is None:
        raise HTTPException(status_code=404, detail="Interaction not found")

    visible_ids = _resolve_visible_contact_ids(session, current_user)
    current_attendees = set(
        session.exec(
            select(InteractionAttendee.contact_id).where(
                InteractionAttendee.interaction_id == interaction_id
            )
        ).all()
    )
    if not (current_attendees & visible_ids):
        raise HTTPException(status_code=404, detail="Interaction not found")

    update_data = interaction_in.model_dump(exclude_unset=True)
    new_attendees_raw = update_data.pop("attendee_ids", None)
    prior_occurred_at = interaction.occurred_at
    interaction.sqlmodel_update(update_data)
    session.add(interaction)

    affected: set[uuid.UUID] = set()

    if new_attendees_raw is not None:
        new_attendees = {uuid.UUID(str(a)) for a in new_attendees_raw}
        if not new_attendees:
            raise HTTPException(status_code=400, detail="attendee_ids cannot be empty")
        for aid in new_attendees:
            if aid not in visible_ids:
                raise HTTPException(status_code=404, detail="Contact not found")

        to_add = new_attendees - current_attendees
        to_remove = current_attendees - new_attendees
        for aid in to_remove:
            row = session.get(InteractionAttendee, (interaction_id, aid))
            if row is not None:
                session.delete(row)
        for aid in to_add:
            session.add(
                InteractionAttendee(interaction_id=interaction_id, contact_id=aid)
            )
        affected |= new_attendees | current_attendees
    else:
        affected |= current_attendees

    # If occurred_at changed, every current attendee's last_contacted_at may shift.
    if "occurred_at" in update_data and update_data["occurred_at"] != prior_occurred_at:
        affected |= current_attendees

    session.flush()
    for aid in affected:
        recompute_last_contacted_at(session=session, contact_id=aid)
    session.commit()
    session.refresh(interaction)

    return _interaction_to_public(session, interaction, visible_ids)


@router.delete("/{interaction_id}", response_model=Ok)
def delete_interaction(
    session: SessionDep,
    current_user: CurrentUser,
    interaction_id: uuid.UUID,
) -> Ok:
    """Soft-delete an interaction by setting deleted_at."""
    interaction = session.get(Interaction, interaction_id)
    if interaction is None:
        raise HTTPException(status_code=404, detail="Interaction not found")

    visible_ids = _resolve_visible_contact_ids(session, current_user)
    attendee_ids = set(
        session.exec(
            select(InteractionAttendee.contact_id).where(
                InteractionAttendee.interaction_id == interaction_id
            )
        ).all()
    )
    if not (attendee_ids & visible_ids):
        raise HTTPException(status_code=404, detail="Interaction not found")

    interaction.deleted_at = datetime.now(timezone.utc)
    session.add(interaction)
    session.flush()
    for aid in attendee_ids:
        recompute_last_contacted_at(session=session, contact_id=aid)
    session.commit()
    return Ok()


@router.post("/{interaction_id}/confirm", response_model=InteractionPublic)
def confirm_draft(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    interaction_id: uuid.UUID,
) -> Any:
    """Confirm (promote) a draft interaction to a real interaction.

    Sets is_draft=False and recomputes last_contacted_at for attendees.
    """
    interaction = session.get(Interaction, interaction_id)
    if interaction is None:
        raise HTTPException(status_code=404, detail="Interaction not found")

    visible_ids = _resolve_visible_contact_ids(session, current_user)
    attendee_ids = set(
        session.exec(
            select(InteractionAttendee.contact_id).where(
                InteractionAttendee.interaction_id == interaction_id
            )
        ).all()
    )
    if not (attendee_ids & visible_ids):
        raise HTTPException(status_code=404, detail="Interaction not found")

    if not interaction.is_draft:
        raise HTTPException(status_code=400, detail="Interaction is already confirmed")

    # Promote the draft
    interaction.is_draft = False
    interaction.draft_source = None
    session.add(interaction)
    session.flush()

    # Recompute last_contacted_at for all attendees
    for aid in attendee_ids:
        recompute_last_contacted_at(session=session, contact_id=aid)

    session.commit()
    session.refresh(interaction)
    return _interaction_to_public(session, interaction, visible_ids)
