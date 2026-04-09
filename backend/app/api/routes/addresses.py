"""Address management routes."""

import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.crud import create_address
from app.models import Address, AddressCreate, AddressPublic, AddressUpdate, Contact

router = APIRouter(prefix="/addresses", tags=["addresses"])


@router.get("/contact/{contact_id}")
def list_addresses(
    session: SessionDep,
    current_user: CurrentUser,
    contact_id: uuid.UUID,
) -> Any:
    """List all addresses for a contact."""
    contact = session.get(Contact, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    if contact.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    statement = select(Address).where(Address.contact_id == contact_id)
    addresses = session.exec(statement).all()

    return {
        "data": [AddressPublic.model_validate(a) for a in addresses],
        "count": len(addresses),
    }


@router.post("/", response_model=AddressPublic)
def create_address_route(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    address_in: AddressCreate,
) -> Any:
    """Create a new address."""
    contact = session.get(Contact, address_in.contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    if contact.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    address = create_address(session=session, address_in=address_in)
    return AddressPublic.model_validate(address)


@router.patch("/{address_id}", response_model=AddressPublic)
def update_address(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    address_id: uuid.UUID,
    address_in: AddressUpdate,
) -> Any:
    """Update an address."""
    address = session.get(Address, address_id)
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")

    contact = session.get(Contact, address.contact_id)
    if contact.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    update_data = address_in.model_dump(exclude_unset=True)
    address.sqlmodel_update(update_data)
    session.add(address)
    session.commit()
    session.refresh(address)
    return AddressPublic.model_validate(address)


@router.delete("/{address_id}")
def delete_address(
    session: SessionDep,
    current_user: CurrentUser,
    address_id: uuid.UUID,
) -> Any:
    """Delete an address."""
    address = session.get(Address, address_id)
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")

    contact = session.get(Contact, address.contact_id)
    if contact.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    session.delete(address)
    session.commit()
    return {"ok": True}
