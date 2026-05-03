"""Tags resource for Kindred SDK."""

from personal_crm_client import AuthenticatedClient, Client
from personal_crm_client.models import (
    TagCreate,
    TagUpdate,
    TagPublic,
    TagsPublic,
    HTTPValidationError,
)
from uuid import UUID

from typing import Optional


class TagsResource:
    """Resource for managing tags."""

    def __init__(self, client: AuthenticatedClient | Client) -> None:
        self._client = client

    def list(
        self, *, skip: int = 0, limit: int = 100
    ) -> TagsPublic | HTTPValidationError | None:
        """List tags."""
        from personal_crm_client.api.tags.tags_list_tags import sync

        return sync(client=self._client, skip=skip, limit=limit)

    async def list_async(
        self, *, skip: int = 0, limit: int = 100
    ) -> TagsPublic | HTTPValidationError | None:
        """Async version of list()."""
        from personal_crm_client.api.tags.tags_list_tags import asyncio

        return await asyncio(client=self._client, skip=skip, limit=limit)

    def get(self, tag_id: UUID) -> TagPublic | HTTPValidationError | None:
        """Get a single tag by ID."""
        from personal_crm_client.api.tags.tags_list_tags import sync

        # Note: The generated client may not have a separate get function
        tags = self.list()
        if tags and hasattr(tags, 'data'):
            for tag in tags.data:
                if tag.id == tag_id:
                    return tag
        return None

    def create(self, item: TagCreate) -> TagPublic | HTTPValidationError | None:
        """Create a new tag."""
        from personal_crm_client.api.tags.tags_create_tag_route import sync

        return sync(client=self._client, body=item)

    async def create_async(self, item: TagCreate) -> TagPublic | HTTPValidationError | None:
        """Async version of create()."""
        from personal_crm_client.api.tags.tags_create_tag_route import asyncio

        return await asyncio(client=self._client, body=item)

    def update(
        self, tag_id: UUID, item: TagUpdate
    ) -> TagPublic | HTTPValidationError | None:
        """Update an existing tag."""
        from personal_crm_client.api.tags.tags_update_tag import sync

        return sync(client=self._client, tag_id=tag_id, body=item)

    async def update_async(
        self, tag_id: UUID, item: TagUpdate
    ) -> TagPublic | HTTPValidationError | None:
        """Async version of update()."""
        from personal_crm_client.api.tags.tags_update_tag import asyncio

        return await asyncio(client=self._client, tag_id=tag_id, body=item)

    def delete(self, tag_id: UUID) -> TagPublic | HTTPValidationError | None:
        """Delete a tag."""
        from personal_crm_client.api.tags.tags_delete_tag import sync

        return sync(client=self._client, tag_id=tag_id)

    async def delete_async(self, tag_id: UUID) -> TagPublic | HTTPValidationError | None:
        """Async version of delete()."""
        from personal_crm_client.api.tags.tags_delete_tag import asyncio

        return await asyncio(client=self._client, tag_id=tag_id)
