"""Notes resource for Kindred SDK."""

from uuid import UUID

from personal_crm_client import AuthenticatedClient, Client
from personal_crm_client.models import (
    HTTPValidationError,
    NoteCreate,
    NotePublic,
    NotesPublic,
    NoteUpdate,
)


class NotesResource:
    """Resource for managing notes."""

    def __init__(self, client: AuthenticatedClient | Client) -> None:
        self._client = client

    def list(
        self,
        *,
        skip: int = 0,
        limit: int = 100,
        contact_id: UUID | None = None,
    ) -> NotesPublic | HTTPValidationError | None:
        """List notes."""
        from personal_crm_client.api.notes.notes_list_notes import sync

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
    ) -> NotesPublic | HTTPValidationError | None:
        """Async version of list()."""
        from personal_crm_client.api.notes.notes_list_notes import asyncio

        return await asyncio(
            client=self._client,
            skip=skip,
            limit=limit,
            contact_id=contact_id,
        )

    def get(self, note_id: UUID) -> NotePublic | HTTPValidationError | None:
        """Get a single note by ID."""
        notes = self.list()
        if notes and hasattr(notes, "data"):
            for note in notes.data:
                if note.id == note_id:
                    return note
        return None

    async def get_async(self, note_id: UUID) -> NotePublic | HTTPValidationError | None:
        """Async version of get()."""
        notes = await self.list_async()
        if notes and hasattr(notes, "data"):
            for note in notes.data:
                if note.id == note_id:
                    return note
        return None

    def create(self, item: NoteCreate) -> NotePublic | HTTPValidationError | None:
        """Create a new note."""
        from personal_crm_client.api.notes.notes_create_note_route import sync

        return sync(client=self._client, body=item)

    async def create_async(self, item: NoteCreate) -> NotePublic | HTTPValidationError | None:
        """Async version of create()."""
        from personal_crm_client.api.notes.notes_create_note_route import asyncio

        return await asyncio(client=self._client, body=item)

    def update(self, note_id: UUID, item: NoteUpdate) -> NotePublic | HTTPValidationError | None:
        """Update an existing note."""
        from personal_crm_client.api.notes.notes_update_note_route import sync

        return sync(client=self._client, note_id=note_id, body=item)

    async def update_async(self, note_id: UUID, item: NoteUpdate) -> NotePublic | HTTPValidationError | None:
        """Async version of update()."""
        from personal_crm_client.api.notes.notes_update_note_route import asyncio

        return await asyncio(client=self._client, note_id=note_id, body=item)

    def delete(self, note_id: UUID) -> NotePublic | HTTPValidationError | None:
        """Delete a note."""
        from personal_crm_client.api.notes.notes_delete_note import sync

        return sync(client=self._client, note_id=note_id)

    async def delete_async(self, note_id: UUID) -> NotePublic | HTTPValidationError | None:
        """Async version of delete()."""
        from personal_crm_client.api.notes.notes_delete_note import asyncio

        return await asyncio(client=self._client, note_id=note_id)
