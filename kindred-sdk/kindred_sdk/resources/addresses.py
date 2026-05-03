"""Addresses resource for Kindred SDK."""

from personal_crm_client import AuthenticatedClient, Client
from personal_crm_client.models import (
    AddressCreate,
    AddressUpdate,
    AddressPublic,
    AddressesPublic,
    HTTPValidationError,
)
from uuid import UUID

from typing import Optional


class AddressesResource:
    """Resource for managing addresses."""

    def __init__(self, client: AuthenticatedClient | Client) -> None:
        self._client = client

    def list(
        self,
        *,
        skip: int = 0,
        limit: int = 100,
        contact_id: Optional[UUID] = None,
    ) -> AddressesPublic | HTTPValidationError | None:
        """List addresses."""
        from personal_crm_client.api.addresses.addresses_list_addresses import sync

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
        contact_id: Optional[UUID] = None,
    ) -> AddressesPublic | HTTPValidationError | None:
        """Async version of list()."""
        from personal_crm_client.api.addresses.addresses_list_addresses import asyncio

        return await asyncio(
            client=self._client,
            skip=skip,
            limit=limit,
            contact_id=contact_id,
        )

    def get(self, address_id: UUID) -> AddressPublic | HTTPValidationError | None:
        """Get a single address by ID."""
        from personal_crm_client.api.addresses.addresses_list_addresses import sync

        addresses = self.list()
        if addresses and hasattr(addresses, 'data'):
            for address in addresses.data:
                if address.id == address_id:
                    return address
        return None

    def create(self, item: AddressCreate) -> AddressPublic | HTTPValidationError | None:
        """Create a new address."""
        from personal_crm_client.api.addresses.addresses_create_address_route import sync

        return sync(client=self._client, body=item)

    async def create_async(self, item: AddressCreate) -> AddressPublic | HTTPValidationError | None:
        """Async version of create()."""
        from personal_crm_client.api.addresses.addresses_create_address_route import asyncio

        return await asyncio(client=self._client, body=item)

    def update(
        self, address_id: UUID, item: AddressUpdate
    ) -> AddressPublic | HTTPValidationError | None:
        """Update an existing address."""
        from personal_crm_client.api.addresses.addresses_update_address import sync

        return sync(client=self._client, address_id=address_id, body=item)

    async def update_async(
        self, address_id: UUID, item: AddressUpdate
    ) -> AddressPublic | HTTPValidationError | None:
        """Async version of update()."""
        from personal_crm_client.api.addresses.addresses_update_address import asyncio

        return await asyncio(client=self._client, address_id=address_id, body=item)

    def delete(self, address_id: UUID) -> AddressPublic | HTTPValidationError | None:
        """Delete an address."""
        from personal_crm_client.api.addresses.addresses_delete_address import sync

        return sync(client=self._client, address_id=address_id)

    async def delete_async(
        self, address_id: UUID
    ) -> AddressPublic | HTTPValidationError | None:
        """Async version of delete()."""
        from personal_crm_client.api.addresses.addresses_delete_address import asyncio

        return await asyncio(client=self._client, address_id=address_id)
