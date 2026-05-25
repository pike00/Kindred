"""Pet management routes."""

import uuid

from fastapi import APIRouter, HTTPException
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.crud import create_pet
from app.models import (
    Contact,
    Ok,
    Pet,
    PetCreate,
    PetPublic,
    PetsPublic,
    PetUpdate,
)

router = APIRouter(prefix="/pets", tags=["pets"])


@router.get("/contact/{contact_id}", response_model=PetsPublic)
def list_pets(
    session: SessionDep,
    current_user: CurrentUser,
    contact_id: uuid.UUID,
) -> PetsPublic:
    """List pets for a contact."""
    contact = session.get(Contact, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    if contact.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    statement = select(Pet).where(Pet.contact_id == contact_id)
    pets = session.exec(statement).all()

    return PetsPublic(
        data=[PetPublic.model_validate(p) for p in pets],
        count=len(pets),
    )


@router.post("/", response_model=PetPublic)
def create_pet_route(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    pet_in: PetCreate,
) -> PetPublic:
    """Create a new pet."""
    contact = session.get(Contact, pet_in.contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    if contact.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    pet = create_pet(session=session, pet_in=pet_in)
    return PetPublic.model_validate(pet)


@router.patch("/{pet_id}", response_model=PetPublic)
def update_pet(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    pet_id: uuid.UUID,
    pet_in: PetUpdate,
) -> PetPublic:
    """Update a pet."""
    pet = session.get(Pet, pet_id)
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")

    contact = session.get(Contact, pet.contact_id)
    if contact.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    update_data = pet_in.model_dump(exclude_unset=True)
    pet.sqlmodel_update(update_data)
    session.add(pet)
    session.commit()
    session.refresh(pet)
    return PetPublic.model_validate(pet)


@router.delete("/{pet_id}", response_model=Ok)
def delete_pet(
    session: SessionDep,
    current_user: CurrentUser,
    pet_id: uuid.UUID,
) -> Ok:
    """Delete a pet."""
    pet = session.get(Pet, pet_id)
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")

    contact = session.get(Contact, pet.contact_id)
    if contact.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    session.delete(pet)
    session.commit()
    return Ok()
