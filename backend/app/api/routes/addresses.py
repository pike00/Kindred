"""Address management routes."""

import logging
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

try:
    from app.services import geocoding

    _geocoding_available = True
except ImportError:
    _geocoding_available = False

logger = logging.getLogger(__name__)

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

    # Geocode if latitude/longitude not provided
    if address.latitude is None or address.longitude is None:
        _geocode_address(session, address)

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

    # Geocode if coordinates still missing after update
    session.refresh(address)
    if address.latitude is None or address.longitude is None:
        _geocode_address(session, address)

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


def _geocode_address(session: Any, address: Address) -> None:
    """Attempt to geocode an address and update its coordinates."""
    if not _geocoding_available:
        return
    try:
        result = geocoding.geocode_address(
            street=address.street,
            city=address.city,
            region=address.region,
            postal_code=address.postal_code,
            country=address.country,
        )
        if result:
            address.latitude = result[0]
            address.longitude = result[1]
            session.add(address)
            session.commit()
            logger.info(f"Geocoded address {address.id}: ({result[0]}, {result[1]})")
    except Exception as e:
        logger.warning(f"Failed to geocode address {address.id}: {e}")


@router.post("/{address_id}/geocode", response_model=AddressPublic)
def geocode_address_manual(
    session: SessionDep,
    current_user: CurrentUser,
    address_id: uuid.UUID,
) -> Any:
    """Manually trigger geocoding for an address."""
    address = session.get(Address, address_id)
    if address is None:
        raise HTTPException(status_code=404, detail="Address not found")
    _require_contact_visible(session, current_user, address.contact_id)

    _geocode_address(session, address)
    session.refresh(address)

    if address.latitude is None or address.longitude is None:
        raise HTTPException(
            status_code=400, detail="Geocoding failed - could not find coordinates"
        )

    return AddressPublic.model_validate(address)


@router.post("/geocode-missing", response_model=dict)
def geocode_missing_coordinates(
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """Trigger geocoding for all addresses missing coordinates (owned by user)."""
    from app.models import Contact

    contacts = session.exec(
        select(Contact).where(Contact.owner_id == current_user.id)
    ).all()
    contact_ids = [c.id for c in contacts]

    addresses = session.exec(
        select(Address).where(
            Address.contact_id.in_(contact_ids),
            (Address.latitude.is_(None) | Address.longitude.is_(None)),
        )
    ).all()

    count = 0
    for address in addresses:
        try:
            if _geocoding_available:
                result = geocoding.geocode_address(
                    street=address.street,
                    city=address.city,
                    region=address.region,
                    postal_code=address.postal_code,
                    country=address.country,
                )
                if result:
                    address.latitude = result[0]
                    address.longitude = result[1]
                    session.add(address)
                    count += 1
        except Exception as e:
            logger.warning(f"Failed to geocode address {address.id}: {e}")

    session.commit()

    return {
        "ok": True,
        "geocoded": count,
        "total": len(addresses),
    }
