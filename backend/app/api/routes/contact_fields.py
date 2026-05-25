"""Contact field management routes."""

import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.crud import contact_visible, create_contact_field
from app.models import (
    ContactField,
    ContactFieldCreate,
    ContactFieldPublic,
    ContactFieldsPublic,
    ContactFieldUpdate,
    Ok,
)

router = APIRouter(prefix="/contact-fields", tags=["contact-fields"])


def _require_contact_visible(session: Any, user: Any, contact_id: uuid.UUID) -> None:
    if not contact_visible(session=session, user=user, contact_id=contact_id):
        raise HTTPException(status_code=404, detail="Contact not found")


@router.get("/contact/{contact_id}", response_model=ContactFieldsPublic)
def list_contact_fields(
    session: SessionDep,
    current_user: CurrentUser,
    contact_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> ContactFieldsPublic:
    """List all fields for a contact."""
    _require_contact_visible(session, current_user, contact_id)

    statement = (
        select(ContactField)
        .where(ContactField.contact_id == contact_id)
        .order_by(ContactField.sort_order)
        .offset(skip)
        .limit(limit)
    )
    fields = session.exec(statement).all()

    count_statement = select(func.count(ContactField.id)).where(
        ContactField.contact_id == contact_id
    )
    count = session.exec(count_statement).one()

    return ContactFieldsPublic(
        data=[ContactFieldPublic.model_validate(f) for f in fields],
        count=count,
    )


@router.post("/", response_model=ContactFieldPublic)
def create_contact_field_route(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    field_in: ContactFieldCreate,
) -> ContactFieldPublic:
    """Create a new contact field."""
    _require_contact_visible(session, current_user, field_in.contact_id)

    field = create_contact_field(session=session, field_in=field_in)
    return ContactFieldPublic.model_validate(field)


@router.patch("/{field_id}", response_model=ContactFieldPublic)
def update_contact_field(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    field_id: uuid.UUID,
    field_in: ContactFieldUpdate,
) -> ContactFieldPublic:
    """Update a contact field."""
    field = session.get(ContactField, field_id)
    if field is None:
        raise HTTPException(status_code=404, detail="Field not found")
    _require_contact_visible(session, current_user, field.contact_id)

    update_data = field_in.model_dump(exclude_unset=True)
    field.sqlmodel_update(update_data)
    session.add(field)
    session.commit()
    session.refresh(field)
    return ContactFieldPublic.model_validate(field)


@router.delete("/{field_id}", response_model=Ok)
def delete_contact_field(
    session: SessionDep,
    current_user: CurrentUser,
    field_id: uuid.UUID,
) -> Ok:
    """Delete a contact field."""
    field = session.get(ContactField, field_id)
    if field is None:
        raise HTTPException(status_code=404, detail="Field not found")
    _require_contact_visible(session, current_user, field.contact_id)

    session.delete(field)
    session.commit()
    return Ok()
