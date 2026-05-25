"""Gifts resource for Kindred SDK."""

from uuid import UUID

from personal_crm_client import AuthenticatedClient, Client
from personal_crm_client.models import (
    GiftCreate,
    GiftPublic,
    GiftsPublic,
    GiftUpdate,
    HTTPValidationError,
)


class GiftsResource:
    """Resource for managing gifts."""

    def __init__(self, client: AuthenticatedClient | Client) -> None:
        self._client = client

    def list(
        self,
        *,
        skip: int = 0,
        limit: int = 100,
        contact_id: UUID | None = None,
    ) -> GiftsPublic | HTTPValidationError | None:
        """List gifts."""
        from personal_crm_client.api.gifts.gifts_list_gifts import sync

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
    ) -> GiftsPublic | HTTPValidationError | None:
        """Async version of list()."""
        from personal_crm_client.api.gifts.gifts_list_gifts import asyncio

        return await asyncio(
            client=self._client,
            skip=skip,
            limit=limit,
            contact_id=contact_id,
        )

    def get(self, gift_id: UUID) -> GiftPublic | HTTPValidationError | None:
        """Get a single gift by ID."""

        gifts = self.list()
        if gifts and hasattr(gifts, "data"):
            for gift in gifts.data:
                if gift.id == gift_id:
                    return gift
        return None

    def create(self, item: GiftCreate) -> GiftPublic | HTTPValidationError | None:
        """Create a new gift."""
        from personal_crm_client.api.gifts.gifts_create_gift_route import sync

        return sync(client=self._client, body=item)

    async def create_async(self, item: GiftCreate) -> GiftPublic | HTTPValidationError | None:
        """Async version of create()."""
        from personal_crm_client.api.gifts.gifts_create_gift_route import asyncio

        return await asyncio(client=self._client, body=item)

    def update(self, gift_id: UUID, item: GiftUpdate) -> GiftPublic | HTTPValidationError | None:
        """Update an existing gift."""
        from personal_crm_client.api.gifts.gifts_update_gift import sync

        return sync(client=self._client, gift_id=gift_id, body=item)

    async def update_async(self, gift_id: UUID, item: GiftUpdate) -> GiftPublic | HTTPValidationError | None:
        """Async version of update()."""
        from personal_crm_client.api.gifts.gifts_update_gift import asyncio

        return await asyncio(client=self._client, gift_id=gift_id, body=item)

    def delete(self, gift_id: UUID) -> GiftPublic | HTTPValidationError | None:
        """Delete a gift."""
        from personal_crm_client.api.gifts.gifts_delete_gift import sync

        return sync(client=self._client, gift_id=gift_id)

    async def delete_async(self, gift_id: UUID) -> GiftPublic | HTTPValidationError | None:
        """Async version of delete()."""
        from personal_crm_client.api.gifts.gifts_delete_gift import asyncio

        return await asyncio(client=self._client, gift_id=gift_id)
