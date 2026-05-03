"""Relationships resource for Kindred SDK."""

from personal_crm_client import AuthenticatedClient, Client
from personal_crm_client.models import (
    RelationshipCreate,
    RelationshipUpdate,
    RelationshipPublic,
    RelationshipsPublic,
    HTTPValidationError,
)
from uuid import UUID

from typing import Optional


class RelationshipsResource:
    """Resource for managing relationships."""

    def __init__(self, client: AuthenticatedClient | Client) -> None:
        self._client = client

    def list(
        self,
        *,
        skip: int = 0,
        limit: int = 100,
        contact_id: Optional[UUID] = None,
    ) -> RelationshipsPublic | HTTPValidationError | None:
        """List relationships."""
        from personal_crm_client.api.relationships.relationships_list_relationships import sync

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
    ) -> RelationshipsPublic | HTTPValidationError | None:
        """Async version of list()."""
        from personal_crm_client.api.relationships.relationships_list_relationships import asyncio

        return await asyncio(
            client=self._client,
            skip=skip,
            limit=limit,
            contact_id=contact_id,
        )

    def get(self, relationship_id: UUID) -> RelationshipPublic | HTTPValidationError | None:
        """Get a single relationship by ID."""
        from personal_crm_client.api.relationships.relationships_list_relationships import sync

        relationships = self.list()
        if relationships and hasattr(relationships, 'data'):
            for rel in relationships.data:
                if rel.id == relationship_id:
                    return rel
        return None

    def create(self, item: RelationshipCreate) -> RelationshipPublic | HTTPValidationError | None:
        """Create a new relationship."""
        from personal_crm_client.api.relationships.relationships_create_relationship_route import sync

        return sync(client=self._client, body=item)

    async def create_async(self, item: RelationshipCreate) -> RelationshipPublic | HTTPValidationError | None:
        """Async version of create()."""
        from personal_crm_client.api.relationships.relationships_create_relationship_route import asyncio

        return await asyncio(client=self._client, body=item)

    def update(
        self, relationship_id: UUID, item: RelationshipUpdate
    ) -> RelationshipPublic | HTTPValidationError | None:
        """Update an existing relationship."""
        from personal_crm_client.api.relationships.relationships_update_relationship import sync

        return sync(client=self._client, relationship_id=relationship_id, body=item)

    async def update_async(
        self, relationship_id: UUID, item: RelationshipUpdate
    ) -> RelationshipPublic | HTTPValidationError | None:
        """Async version of update()."""
        from personal_crm_client.api.relationships.relationships_update_relationship import asyncio

        return await asyncio(client=self._client, relationship_id=relationship_id, body=item)

    def delete(self, relationship_id: UUID) -> RelationshipPublic | HTTPValidationError | None:
        """Delete a relationship."""
        from personal_crm_client.api.relationships.relationships_delete_relationship import sync

        return sync(client=self._client, relationship_id=relationship_id)

    async def delete_async(
        self, relationship_id: UUID
    ) -> RelationshipPublic | HTTPValidationError | None:
        """Async version of delete()."""
        from personal_crm_client.api.relationships.relationships_delete_relationship import asyncio

        return await asyncio(client=self._client, relationship_id=relationship_id)

    def lookup_inverse(
        self, relationship_type: str
    ) -> object | HTTPValidationError | None:
        """Look up the inverse of a relationship type."""
        from personal_crm_client.api.relationships.relationships_lookup_inverse import sync

        return sync(client=self._client, relationship_type=relationship_type)

    async def lookup_inverse_async(
        self, relationship_type: str
    ) -> object | HTTPValidationError | None:
        """Async version of lookup_inverse()."""
        from personal_crm_client.api.relationships.relationships_lookup_inverse import asyncio

        return await asyncio(client=self._client, relationship_type=relationship_type)
