"""Address management routes."""

import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.crud import contact_visible, create_address
from app.models import (
    Address,
    AddressCreate,
    AddressesPublic,
    AddressPublic,
    AddressUpdate,
    Ok,
)

router = APIRouter(prefix="/addresses", tags=["addresses"])


def _require_contact_visible(session: Any, user: Any, contact_id: uuid.UUID) -> None:
    if not contact_visible(session=session, user=user, contact_id=contact_id):
        raise HTTPException(status_code=404, detail="Contact not found")


@router.get("/contact/{contact_id}", response_model=AddressesPublic)
def list_addresses(
    session: SessionDep,
    current_user: CurrentUser,
    contact_id: uuid.UUID,
) -> AddressesPublic:
    """List all addresses for a contact."""
    _require_contact_visible(session, current_user, contact_id)

    statement = select(Address).where(Address.contact_id == contact_id)
    addresses = session.exec(statement).all()

    return AddressesPublic(
        data=[AddressPublic.model_validate(a) for a in addresses],
        count=len(addresses),
    )


@router.post("/", response_model=AddressPublic)
def create_address_route(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    address_in: AddressCreate,
) -> AddressPublic:
    """Create a new address."""
    _require_contact_visible(session, current_user, address_in.contact_id)

    address = create_address(session=session, address_in=address_in)
    return AddressPublic.model_validate(address)


@router.patch("/{address_id}", response_model=AddressPublic)
def update_address(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    address_id: uuid.UUID,
    address_in: AddressUpdate,
) -> AddressPublic:
    """Update an address."""
    address = session.get(Address, address_id)
    if address is None:
        raise HTTPException(status_code=404, detail="Address not found")
    _require_contact_visible(session, current_user, address.contact_id)

    update_data = address_in.model_dump(exclude_unset=True)
    address.sqlmodel_update(update_data)
    session.add(address)
    session.commit()
    session.refresh(address)
    return AddressPublic.model_validate(address)


@router.delete("/{address_id}", response_model=Ok)
def delete_address(
    session: SessionDep,
    current_user: CurrentUser,
    address_id: uuid.UUID,
) -> Ok:
    """Delete an address."""
    address = session.get(Address, address_id)
    if address is None:
        raise HTTPException(status_code=404, detail="Address not found")
    _require_contact_visible(session, current_user, address.contact_id)

    session.delete(address)
    session.commit()
    return Ok()
