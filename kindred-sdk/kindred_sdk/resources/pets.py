"""Pets resource for Kindred SDK."""

from uuid import UUID

from personal_crm_client import AuthenticatedClient, Client
from personal_crm_client.models import (
    HTTPValidationError,
    PetCreate,
    PetPublic,
    PetsPublic,
    PetUpdate,
)


class PetsResource:
    """Resource for managing pets."""

    def __init__(self, client: AuthenticatedClient | Client) -> None:
        self._client = client

    def list(
        self,
        *,
        skip: int = 0,
        limit: int = 100,
        contact_id: UUID | None = None,
    ) -> PetsPublic | HTTPValidationError | None:
        """List pets."""
        from personal_crm_client.api.pets.pets_list_pets import sync

        return sync(
            client=self._client,
            skip=skip,
            limit=limit,
            contact_id=contact_id,
        )

    async def list_async(
        self,
        *,
        skip: int = 0,
        limit: int = 100,
        contact_id: UUID | None = None,
    ) -> PetsPublic | HTTPValidationError | None:
        """Async version of list()."""
        from personal_crm_client.api.pets.pets_list_pets import asyncio

        return await asyncio(
            client=self._client,
            skip=skip,
            limit=limit,
            contact_id=contact_id,
        )

    def get(self, pet_id: UUID) -> PetPublic | HTTPValidationError | None:
        """Get a single pet by ID."""
        pets = self.list()
        if pets and hasattr(pets, "data"):
            for pet in pets.data:
                if pet.id == pet_id:
                    return pet
        return None

    async def get_async(self, pet_id: UUID) -> PetPublic | HTTPValidationError | None:
        """Async version of get()."""
        pets = await self.list_async()
        if pets and hasattr(pets, "data"):
            for pet in pets.data:
                if pet.id == pet_id:
                    return pet
        return None

    def create(self, item: PetCreate) -> PetPublic | HTTPValidationError | None:
        """Create a new pet."""
        from personal_crm_client.api.pets.pets_create_pet_route import sync

        return sync(client=self._client, body=item)

    async def create_async(self, item: PetCreate) -> PetPublic | HTTPValidationError | None:
        """Async version of create()."""
        from personal_crm_client.api.pets.pets_create_pet_route import asyncio

        return await asyncio(client=self._client, body=item)

    def update(self, pet_id: UUID, item: PetUpdate) -> PetPublic | HTTPValidationError | None:
        """Update an existing pet."""
        from personal_crm_client.api.pets.pets_update_pet import sync

        return sync(client=self._client, pet_id=pet_id, body=item)

    async def update_async(self, pet_id: UUID, item: PetUpdate) -> PetPublic | HTTPValidationError | None:
        """Async version of update()."""
        from personal_crm_client.api.pets.pets_update_pet import asyncio

        return await asyncio(client=self._client, pet_id=pet_id, body=item)

    def delete(self, pet_id: UUID) -> PetPublic | HTTPValidationError | None:
        """Delete a pet."""
        from personal_crm_client.api.pets.pets_delete_pet import sync

        return sync(client=self._client, pet_id=pet_id)

    async def delete_async(self, pet_id: UUID) -> PetPublic | HTTPValidationError | None:
        """Async version of delete()."""
        from personal_crm_client.api.pets.pets_delete_pet import asyncio

        return await asyncio(client=self._client, pet_id=pet_id)
