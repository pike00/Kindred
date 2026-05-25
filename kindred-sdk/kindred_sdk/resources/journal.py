"""Journal resource for Kindred SDK."""

from uuid import UUID

from personal_crm_client import AuthenticatedClient, Client
from personal_crm_client.models import (
    HTTPValidationError,
    JournalEntriesPublic,
    JournalEntryCreate,
    JournalEntryPublic,
    JournalEntryUpdate,
)


class JournalResource:
    """Resource for managing journal entries."""

    def __init__(self, client: AuthenticatedClient | Client) -> None:
        self._client = client

    def list(
        self,
        *,
        skip: int = 0,
        limit: int = 100,
    ) -> JournalEntriesPublic | HTTPValidationError | None:
        """List journal entries."""
        from personal_crm_client.api.journal.journal_list_journal_entries import sync

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
    ) -> JournalEntriesPublic | HTTPValidationError | None:
        """Async version of list()."""
        from personal_crm_client.api.journal.journal_list_journal_entries import asyncio

        return await asyncio(
            client=self._client,
            skip=skip,
            limit=limit,
        )

    def get(self, entry_id: UUID) -> JournalEntryPublic | HTTPValidationError | None:
        """Get a single journal entry by ID."""

        entries = self.list()
        if entries and hasattr(entries, "data"):
            for entry in entries.data:
                if entry.id == entry_id:
                    return entry
        return None

    def create(self, item: JournalEntryCreate) -> JournalEntryPublic | HTTPValidationError | None:
        """Create a new journal entry."""
        from personal_crm_client.api.journal.journal_create_journal_entry_route import sync

        return sync(client=self._client, body=item)

    async def create_async(self, item: JournalEntryCreate) -> JournalEntryPublic | HTTPValidationError | None:
        """Async version of create()."""
        from personal_crm_client.api.journal.journal_create_journal_entry_route import asyncio

        return await asyncio(client=self._client, body=item)

    def update(self, entry_id: UUID, item: JournalEntryUpdate) -> JournalEntryPublic | HTTPValidationError | None:
        """Update an existing journal entry."""
        from personal_crm_client.api.journal.journal_update_journal_entry import sync

        return sync(client=self._client, entry_id=entry_id, body=item)

    async def update_async(
        self, entry_id: UUID, item: JournalEntryUpdate
    ) -> JournalEntryPublic | HTTPValidationError | None:
        """Async version of update()."""
        from personal_crm_client.api.journal.journal_update_journal_entry import asyncio

        return await asyncio(client=self._client, entry_id=entry_id, body=item)

    def delete(self, entry_id: UUID) -> JournalEntryPublic | HTTPValidationError | None:
        """Delete a journal entry."""
        from personal_crm_client.api.journal.journal_delete_journal_entry import sync

        return sync(client=self._client, entry_id=entry_id)

    async def delete_async(self, entry_id: UUID) -> JournalEntryPublic | HTTPValidationError | None:
        """Async version of delete()."""
        from personal_crm_client.api.journal.journal_delete_journal_entry import asyncio

        return await asyncio(client=self._client, entry_id=entry_id)
