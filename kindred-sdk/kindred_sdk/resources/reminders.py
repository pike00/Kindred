"""Reminders resource for Kindred SDK."""

from uuid import UUID

from personal_crm_client import AuthenticatedClient, Client
from personal_crm_client.models import (
    HTTPValidationError,
    ReminderCreate,
    ReminderPublic,
    RemindersPublic,
    ReminderUpdate,
)


class RemindersResource:
    """Resource for managing reminders."""

    def __init__(self, client: AuthenticatedClient | Client) -> None:
        self._client = client

    def list(
        self,
        *,
        skip: int = 0,
        limit: int = 100,
        contact_id: UUID | None = None,
    ) -> RemindersPublic | HTTPValidationError | None:
        """List reminders."""
        from personal_crm_client.api.reminders.reminders_list_reminders import sync

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
    ) -> RemindersPublic | HTTPValidationError | None:
        """Async version of list()."""
        from personal_crm_client.api.reminders.reminders_list_reminders import asyncio

        return await asyncio(
            client=self._client,
            skip=skip,
            limit=limit,
            contact_id=contact_id,
        )

    def get(self, reminder_id: UUID) -> ReminderPublic | HTTPValidationError | None:
        """Get a single reminder by ID."""
        reminders = self.list()
        if reminders and hasattr(reminders, "data"):
            for reminder in reminders.data:
                if reminder.id == reminder_id:
                    return reminder
        return None

    async def get_async(self, reminder_id: UUID) -> ReminderPublic | HTTPValidationError | None:
        """Async version of get()."""
        reminders = await self.list_async()
        if reminders and hasattr(reminders, "data"):
            for reminder in reminders.data:
                if reminder.id == reminder_id:
                    return reminder
        return None

    def create(self, item: ReminderCreate) -> ReminderPublic | HTTPValidationError | None:
        """Create a new reminder."""
        from personal_crm_client.api.reminders.reminders_create_reminder_route import sync

        return sync(client=self._client, body=item)

    async def create_async(self, item: ReminderCreate) -> ReminderPublic | HTTPValidationError | None:
        """Async version of create()."""
        from personal_crm_client.api.reminders.reminders_create_reminder_route import asyncio

        return await asyncio(client=self._client, body=item)

    def update(self, reminder_id: UUID, item: ReminderUpdate) -> ReminderPublic | HTTPValidationError | None:
        """Update an existing reminder."""
        from personal_crm_client.api.reminders.reminders_update_reminder import sync

        return sync(client=self._client, reminder_id=reminder_id, body=item)

    async def update_async(
        self, reminder_id: UUID, item: ReminderUpdate
    ) -> ReminderPublic | HTTPValidationError | None:
        """Async version of update()."""
        from personal_crm_client.api.reminders.reminders_update_reminder import asyncio

        return await asyncio(client=self._client, reminder_id=reminder_id, body=item)

    def delete(self, reminder_id: UUID) -> ReminderPublic | HTTPValidationError | None:
        """Delete a reminder."""
        from personal_crm_client.api.reminders.reminders_delete_reminder import sync

        return sync(client=self._client, reminder_id=reminder_id)

    async def delete_async(self, reminder_id: UUID) -> ReminderPublic | HTTPValidationError | None:
        """Async version of delete()."""
        from personal_crm_client.api.reminders.reminders_delete_reminder import asyncio

        return await asyncio(client=self._client, reminder_id=reminder_id)

    def snooze(self, reminder_id: UUID, *, snooze_until: str) -> ReminderPublic | HTTPValidationError | None:
        """Snooze a reminder until a specified time."""
        from personal_crm_client.api.reminders.reminders_snooze_reminder import sync

        return sync(
            client=self._client,
            reminder_id=reminder_id,
            snooze_until=snooze_until,
        )

    async def snooze_async(
        self, reminder_id: UUID, *, snooze_until: str
    ) -> ReminderPublic | HTTPValidationError | None:
        """Async version of snooze()."""
        from personal_crm_client.api.reminders.reminders_snooze_reminder import asyncio

        return await asyncio(
            client=self._client,
            reminder_id=reminder_id,
            snooze_until=snooze_until,
        )
