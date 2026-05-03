"""Interactions resource for Kindred SDK."""

from personal_crm_client import AuthenticatedClient, Client
from personal_crm_client.models import (
    InteractionCreate,
    InteractionUpdate,
    InteractionPublic,
    InteractionsPublic,
    HTTPValidationError,
)
from uuid import UUID

from typing import Optional


class InteractionsResource:
    """Resource for managing interactions."""

    def __init__(self, client: AuthenticatedClient | Client) -> None:
        self._client = client

    def list(
        self,
        *,
        skip: int = 0,
        limit: int = 100,
        contact_id: Optional[UUID] = None,
        search: Optional[str] = None,
    ) -> InteractionsPublic | HTTPValidationError | None:
        """List interactions."""
        from personal_crm_client.api.interactions.interactions_list_interactions import sync

        return sync(
            client=self._client,
            skip=skip,
            limit=limit,
            contact_id=contact_id,
            search=search,
        )

    async def list_async(
        self,
        *,
        skip: int = 0,
        limit: int = 100,
        contact_id: Optional[UUID] = None,
        search: Optional[str] = None,
    ) -> InteractionsPublic | HTTPValidationError | None:
        """Async version of list()."""
        from personal_crm_client.api.interactions.interactions_list_interactions import asyncio

        return await asyncio(
            client=self._client,
            skip=skip,
            limit=limit,
            contact_id=contact_id,
            search=search,
        )

    def get(self, interaction_id: UUID) -> InteractionPublic | HTTPValidationError | None:
        """Get a single interaction by ID."""
        from personal_crm_client.api.interactions.interactions_get_interaction import sync

        return sync(client=self._client, interaction_id=interaction_id)

    async def get_async(
        self, interaction_id: UUID
    ) -> InteractionPublic | HTTPValidationError | None:
        """Async version of get()."""
        from personal_crm_client.api.interactions.interactions_get_interaction import asyncio

        return await asyncio(client=self._client, interaction_id=interaction_id)

    def create(
        self, item: InteractionCreate
    ) -> InteractionPublic | HTTPValidationError | None:
        """Create a new interaction."""
        from personal_crm_client.api.interactions.interactions_create_interaction import sync

        return sync(client=self._client, body=item)

    async def create_async(
        self, item: InteractionCreate
    ) -> InteractionPublic | HTTPValidationError | None:
        """Async version of create()."""
        from personal_crm_client.api.interactions.interactions_create_interaction import asyncio

        return await asyncio(client=self._client, body=item)

    def update(
        self, interaction_id: UUID, item: InteractionUpdate
    ) -> InteractionPublic | HTTPValidationError | None:
        """Update an existing interaction."""
        from personal_crm_client.api.interactions.interactions_update_interaction import sync

        return sync(client=self._client, interaction_id=interaction_id, body=item)

    async def update_async(
        self, interaction_id: UUID, item: InteractionUpdate
    ) -> InteractionPublic | HTTPValidationError | None:
        """Async version of update()."""
        from personal_crm_client.api.interactions.interactions_update_interaction import asyncio

        return await asyncio(client=self._client, interaction_id=interaction_id, body=item)

    def delete(self, interaction_id: UUID) -> InteractionPublic | HTTPValidationError | None:
        """Delete an interaction."""
        from personal_crm_client.api.interactions.interactions_delete_interaction import sync

        return sync(client=self._client, interaction_id=interaction_id)

    async def delete_async(
        self, interaction_id: UUID
    ) -> InteractionPublic | HTTPValidationError | None:
        """Async version of delete()."""
        from personal_crm_client.api.interactions.interactions_delete_interaction import asyncio

        return await asyncio(client=self._client, interaction_id=interaction_id)
