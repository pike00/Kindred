"""Contact field management routes."""

import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.crud import create_contact_field
from app.models import (
    Contact,
    ContactField,
    ContactFieldCreate,
    ContactFieldPublic,
    ContactFieldUpdate,
)

router = APIRouter(prefix="/contact-fields", tags=["contact-fields"])


@router.get("/contact/{contact_id}")
def list_contact_fields(
    session: SessionDep,
    current_user: CurrentUser,
    contact_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """List all fields for a contact."""
    contact = session.get(Contact, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    if contact.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

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

    return {
        "data": [ContactFieldPublic.model_validate(f) for f in fields],
        "count": count,
    }


@router.post("/", response_model=ContactFieldPublic)
def create_contact_field_route(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    field_in: ContactFieldCreate,
) -> Any:
    """Create a new contact field."""
    contact = session.get(Contact, field_in.contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    if contact.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    field = create_contact_field(session=session, field_in=field_in)
    return ContactFieldPublic.model_validate(field)


@router.patch("/{field_id}", response_model=ContactFieldPublic)
def update_contact_field(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    field_id: uuid.UUID,
    field_in: ContactFieldUpdate,
) -> Any:
    """Update a contact field."""
    field = session.get(ContactField, field_id)
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")

    contact = session.get(Contact, field.contact_id)
    if contact.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    update_data = field_in.model_dump(exclude_unset=True)
    field.sqlmodel_update(update_data)
    session.add(field)
    session.commit()
    session.refresh(field)
    return ContactFieldPublic.model_validate(field)


@router.delete("/{field_id}")
def delete_contact_field(
    session: SessionDep,
    current_user: CurrentUser,
    field_id: uuid.UUID,
) -> Any:
    """Delete a contact field."""
    field = session.get(ContactField, field_id)
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")

    contact = session.get(Contact, field.contact_id)
    if contact.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    session.delete(field)
    session.commit()
    return {"ok": True}
