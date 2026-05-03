"""Life events resource for Kindred SDK."""

from personal_crm_client import AuthenticatedClient, Client
from personal_crm_client.models import (
    LifeEventCreate,
    LifeEventUpdate,
    LifeEventPublic,
    LifeEventsPublic,
    HTTPValidationError,
)
from uuid import UUID

from typing import Optional


class LifeEventsResource:
    """Resource for managing life events."""

    def __init__(self, client: AuthenticatedClient | Client) -> None:
        self._client = client

    def list(
        self,
        *,
        skip: int = 0,
        limit: int = 100,
        contact_id: Optional[UUID] = None,
    ) -> LifeEventsPublic | HTTPValidationError | None:
        """List life events."""
        from personal_crm_client.api.life_events.life_events_list_life_events import sync

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
    ) -> LifeEventsPublic | HTTPValidationError | None:
        """Async version of list()."""
        from personal_crm_client.api.life_events.life_events_list_life_events import asyncio

        return await asyncio(
            client=self._client,
            skip=skip,
            limit=limit,
            contact_id=contact_id,
        )

    def get(self, life_event_id: UUID) -> LifeEventPublic | HTTPValidationError | None:
        """Get a single life event by ID."""
        from personal_crm_client.api.life_events.life_events_list_life_events import sync

        events = self.list()
        if events and hasattr(events, 'data'):
            for event in events.data:
                if event.id == life_event_id:
                    return event
        return None

    def create(self, item: LifeEventCreate) -> LifeEventPublic | HTTPValidationError | None:
        """Create a new life event."""
        from personal_crm_client.api.life_events.life_events_create_life_event_route import sync

        return sync(client=self._client, body=item)

    async def create_async(self, item: LifeEventCreate) -> LifeEventPublic | HTTPValidationError | None:
        """Async version of create()."""
        from personal_crm_client.api.life_events.life_events_create_life_event_route import asyncio

        return await asyncio(client=self._client, body=item)

    def update(
        self, life_event_id: UUID, item: LifeEventUpdate
    ) -> LifeEventPublic | HTTPValidationError | None:
        """Update an existing life event."""
        from personal_crm_client.api.life_events.life_events_update_life_event import sync

        return sync(client=self._client, life_event_id=life_event_id, body=item)

    async def update_async(
        self, life_event_id: UUID, item: LifeEventUpdate
    ) -> LifeEventPublic | HTTPValidationError | None:
        """Async version of update()."""
        from personal_crm_client.api.life_events.life_events_update_life_event import asyncio

        return await asyncio(client=self._client, life_event_id=life_event_id, body=item)

    def delete(self, life_event_id: UUID) -> LifeEventPublic | HTTPValidationError | None:
        """Delete a life event."""
        from personal_crm_client.api.life_events.life_events_delete_life_event import sync

        return sync(client=self._client, life_event_id=life_event_id)

    async def delete_async(
        self, life_event_id: UUID
    ) -> LifeEventPublic | HTTPValidationError | None:
        """Async version of delete()."""
        from personal_crm_client.api.life_events.life_events_delete_life_event import asyncio

        return await asyncio(client=self._client, life_event_id=life_event_id)
