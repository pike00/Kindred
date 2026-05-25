"""Communication preference management routes."""

import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.crud import contact_visible
from app.models import (
    CommunicationPreference,
    CommunicationPreferenceCreate,
    CommunicationPreferencePublic,
    CommunicationPreferenceUpdate,
    Contact,
)

router = APIRouter(prefix="/contacts", tags=["communication-preferences"])


def _get_contact_or_404(session: Any, contact_id: uuid.UUID) -> Contact:
    """Fetch a contact or raise 404."""
    contact = session.get(Contact, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact


def _require_contact_access(session: Any, user: Any, contact_id: uuid.UUID) -> Contact:
    """Ensure the contact exists and the user has access."""
    contact = _get_contact_or_404(session, contact_id)
    if not contact_visible(session=session, user=user, contact_id=contact_id):
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact


@router.get(
    "/{contact_id}/communication-preference",
    response_model=CommunicationPreferencePublic | None,
)
def get_communication_preference(
    session: SessionDep,
    current_user: CurrentUser,
    contact_id: uuid.UUID,
) -> Any:
    """Get communication preferences for a contact."""
    _require_contact_access(session, current_user, contact_id)

    statement = select(CommunicationPreference).where(
        CommunicationPreference.contact_id == contact_id
    )
    pref = session.exec(statement).first()
    if pref is None:
        return None
    return CommunicationPreferencePublic.model_validate(pref)


@router.patch(
    "/{contact_id}/communication-preference",
    response_model=CommunicationPreferencePublic,
)
def upsert_communication_preference(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    contact_id: uuid.UUID,
    pref_in: CommunicationPreferenceUpdate,
) -> Any:
    """Create or update communication preferences for a contact (upsert)."""
    _require_contact_access(session, current_user, contact_id)

    statement = select(CommunicationPreference).where(
        CommunicationPreference.contact_id == contact_id
    )
    pref = session.exec(statement).first()

    if pref is None:
        # Create new
        create_data = CommunicationPreferenceCreate(
            contact_id=contact_id,
            **pref_in.model_dump(exclude_unset=True),
        )
        pref = CommunicationPreference.model_validate(create_data)
        session.add(pref)
    else:
        # Update existing
        update_data = pref_in.model_dump(exclude_unset=True)
        pref.sqlmodel_update(update_data)
        session.add(pref)

    session.commit()
    session.refresh(pref)
    return CommunicationPreferencePublic.model_validate(pref)


@router.delete("/{contact_id}/communication-preference")
def delete_communication_preference(
    session: SessionDep,
    current_user: CurrentUser,
    contact_id: uuid.UUID,
) -> Any:
    """Delete communication preferences for a contact."""
    _require_contact_access(session, current_user, contact_id)

    statement = select(CommunicationPreference).where(
        CommunicationPreference.contact_id == contact_id
    )
    pref = session.exec(statement).first()
    if pref is None:
        raise HTTPException(
            status_code=404, detail="Communication preference not found"
        )

    session.delete(pref)
    session.commit()
    return {"ok": True}
