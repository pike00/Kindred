"""Groups resource for Kindred SDK."""

from uuid import UUID

from personal_crm_client import AuthenticatedClient, Client
from personal_crm_client.models import (
    GroupCreate,
    GroupPublic,
    GroupsPublic,
    GroupUpdate,
    HTTPValidationError,
)


class GroupsResource:
    """Resource for managing groups."""

    def __init__(self, client: AuthenticatedClient | Client) -> None:
        self._client = client

    def list(
        self,
        *,
        skip: int = 0,
        limit: int = 100,
    ) -> GroupsPublic | HTTPValidationError | None:
        """List groups."""
        from personal_crm_client.api.groups.groups_list_groups import sync

        return sync(
            client=self._client,
            skip=skip,
            limit=limit,
        )

    async def list_async(
        self,
        *,
        skip: int = 0,
        limit: int = 100,
    ) -> GroupsPublic | HTTPValidationError | None:
        """Async version of list()."""
        from personal_crm_client.api.groups.groups_list_groups import asyncio

        return await asyncio(
            client=self._client,
            skip=skip,
            limit=limit,
        )

    def get(self, group_id: UUID) -> GroupPublic | HTTPValidationError | None:
        """Get a single group by ID."""
        groups = self.list()
        if groups and hasattr(groups, "data"):
            for group in groups.data:
                if group.id == group_id:
                    return group
        return None

    async def get_async(self, group_id: UUID) -> GroupPublic | HTTPValidationError | None:
        """Async version of get()."""
        groups = await self.list_async()
        if groups and hasattr(groups, "data"):
            for group in groups.data:
                if group.id == group_id:
                    return group
        return None

    def create(self, item: GroupCreate) -> GroupPublic | HTTPValidationError | None:
        """Create a new group."""
        from personal_crm_client.api.groups.groups_create_group_route import sync

        return sync(client=self._client, body=item)

    async def create_async(self, item: GroupCreate) -> GroupPublic | HTTPValidationError | None:
        """Async version of create()."""
        from personal_crm_client.api.groups.groups_create_group_route import asyncio

        return await asyncio(client=self._client, body=item)

    def update(self, group_id: UUID, item: GroupUpdate) -> GroupPublic | HTTPValidationError | None:
        """Update an existing group."""
        from personal_crm_client.api.groups.groups_update_group import sync

        return sync(client=self._client, group_id=group_id, body=item)

    async def update_async(self, group_id: UUID, item: GroupUpdate) -> GroupPublic | HTTPValidationError | None:
        """Async version of update()."""
        from personal_crm_client.api.groups.groups_update_group import asyncio

        return await asyncio(client=self._client, group_id=group_id, body=item)

    def delete(self, group_id: UUID) -> GroupPublic | HTTPValidationError | None:
        """Delete a group."""
        from personal_crm_client.api.groups.groups_delete_group import sync

        return sync(client=self._client, group_id=group_id)

    async def delete_async(self, group_id: UUID) -> GroupPublic | HTTPValidationError | None:
        """Async version of delete()."""
        from personal_crm_client.api.groups.groups_delete_group import asyncio

        return await asyncio(client=self._client, group_id=group_id)
