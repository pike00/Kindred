"""Contacts resource for Kindred SDK."""

from uuid import UUID

from personal_crm_client import AuthenticatedClient, Client
from personal_crm_client.models import (
    ContactCreate,
    ContactPublic,
    ContactsPublic,
    ContactUpdate,
    HTTPValidationError,
)


class ContactsResource:
    """Resource for managing contacts."""

    def __init__(self, client: AuthenticatedClient | Client) -> None:
        self._client = client

    def list(
        self,
        *,
        skip: int = 0,
        limit: int = 100,
        search: str | None = None,
        tag_id: UUID | None = None,
        group_id: UUID | None = None,
        is_favorite: bool | None = None,
        is_archived: bool | None = None,
        stage: str | None = None,
        include_deleted: bool = False,
        only_deleted: bool = False,
        ids: list[UUID] | None = None,
    ) -> ContactsPublic | HTTPValidationError | None:
        """List contacts with filtering.

        Pass ``ids`` to fetch a specific batch of contacts (useful for
        hydrating references from other resources). When ``ids`` is provided,
        the default ``is_archived=False`` filter is lifted so callers can
        resolve archived rows too.

        Soft-deleted contacts (``deleted_at`` set) are hidden by default.
        Pass ``include_deleted=True`` to surface them alongside live rows, or
        ``only_deleted=True`` to fetch the trash view exclusively.
        """
        from personal_crm_client.api.contacts.contacts_list_contacts import sync

        return sync(
            client=self._client,
            skip=skip,
            limit=limit,
            search=search,
            tag_id=tag_id,
            group_id=group_id,
            is_favorite=is_favorite,
            is_archived=is_archived,
            stage=stage,
            include_deleted=include_deleted,
            only_deleted=only_deleted,
            ids=ids,
        )

    async def list_async(
        self,
        *,
        skip: int = 0,
        limit: int = 100,
        search: str | None = None,
        tag_id: UUID | None = None,
        group_id: UUID | None = None,
        is_favorite: bool | None = None,
        is_archived: bool | None = None,
        stage: str | None = None,
        include_deleted: bool = False,
        only_deleted: bool = False,
        ids: list[UUID] | None = None,
    ) -> ContactsPublic | HTTPValidationError | None:
        """Async version of list()."""
        from personal_crm_client.api.contacts.contacts_list_contacts import asyncio

        return await asyncio(
            client=self._client,
            skip=skip,
            limit=limit,
            search=search,
            tag_id=tag_id,
            group_id=group_id,
            is_favorite=is_favorite,
            is_archived=is_archived,
            stage=stage,
            include_deleted=include_deleted,
            only_deleted=only_deleted,
            ids=ids,
        )

    def get(self, contact_id: UUID) -> ContactPublic | HTTPValidationError | None:
        """Get a single contact by ID."""
        from personal_crm_client.api.contacts.contacts_get_contact import sync

        return sync(
            client=self._client,
            contact_id=contact_id,
        )

    async def get_async(self, contact_id: UUID) -> ContactPublic | HTTPValidationError | None:
        """Async version of get()."""
        from personal_crm_client.api.contacts.contacts_get_contact import asyncio

        return await asyncio(
            client=self._client,
            contact_id=contact_id,
        )

    def create(self, item: ContactCreate) -> ContactPublic | HTTPValidationError | None:
        """Create a new contact."""
        from personal_crm_client.api.contacts.contacts_create_contact import sync

        return sync(
            client=self._client,
            body=item,
        )

    async def create_async(self, item: ContactCreate) -> ContactPublic | HTTPValidationError | None:
        """Async version of create()."""
        from personal_crm_client.api.contacts.contacts_create_contact import asyncio

        return await asyncio(
            client=self._client,
            body=item,
        )

    def update(self, contact_id: UUID, item: ContactUpdate) -> ContactPublic | HTTPValidationError | None:
        """Update an existing contact."""
        from personal_crm_client.api.contacts.contacts_update_contact import sync

        return sync(
            client=self._client,
            contact_id=contact_id,
            body=item,
        )

    async def update_async(self, contact_id: UUID, item: ContactUpdate) -> ContactPublic | HTTPValidationError | None:
        """Async version of update()."""
        from personal_crm_client.api.contacts.contacts_update_contact import asyncio

        return await asyncio(
            client=self._client,
            contact_id=contact_id,
            body=item,
        )

    def delete(self, contact_id: UUID) -> ContactPublic | HTTPValidationError | None:
        """Delete a contact (soft delete)."""
        from personal_crm_client.api.contacts.contacts_delete_contact import sync

        return sync(
            client=self._client,
            contact_id=contact_id,
        )

    async def delete_async(self, contact_id: UUID) -> ContactPublic | HTTPValidationError | None:
        """Async version of delete()."""
        from personal_crm_client.api.contacts.contacts_delete_contact import asyncio

        return await asyncio(
            client=self._client,
            contact_id=contact_id,
        )

    def restore(self, contact_id: UUID) -> ContactPublic | HTTPValidationError | None:
        """Restore a soft-deleted contact."""
        from personal_crm_client.api.contacts.contacts_restore_contact import sync

        return sync(
            client=self._client,
            contact_id=contact_id,
        )

    async def restore_async(self, contact_id: UUID) -> ContactPublic | HTTPValidationError | None:
        """Async version of restore()."""
        from personal_crm_client.api.contacts.contacts_restore_contact import asyncio

        return await asyncio(
            client=self._client,
            contact_id=contact_id,
        )

    def list_mentions(self, contact_id: UUID) -> list | HTTPValidationError | None:
        """List mentions of a contact in notes."""
        from personal_crm_client.api.contacts.contacts_list_contact_mentions import sync

        return sync(
            client=self._client,
            contact_id=contact_id,
        )

    async def list_mentions_async(self, contact_id: UUID) -> list | HTTPValidationError | None:
        """Async version of list_mentions()."""
        from personal_crm_client.api.contacts.contacts_list_contact_mentions import asyncio

        return await asyncio(
            client=self._client,
            contact_id=contact_id,
        )

    def list_losing_touch(
        self,
        *,
        skip: int = 0,
        limit: int = 100,
        search: str | None = None,
    ) -> list | HTTPValidationError | None:
        """List contacts you're losing touch with."""
        from personal_crm_client.api.contacts.contacts_list_losing_touch import sync

        return sync(
            client=self._client,
            skip=skip,
            limit=limit,
            search=search,
        )

    async def list_losing_touch_async(
        self,
        *,
        skip: int = 0,
        limit: int = 100,
        search: str | None = None,
    ) -> list | HTTPValidationError | None:
        """Async version of list_losing_touch()."""
        from personal_crm_client.api.contacts.contacts_list_losing_touch import asyncio

        return await asyncio(
            client=self._client,
            skip=skip,
            limit=limit,
            search=search,
        )

    def get_household(self, contact_id: UUID) -> list | HTTPValidationError | None:
        """Get household members for a contact."""
        from personal_crm_client.api.contacts.contacts_get_contact_household import sync

        return sync(
            client=self._client,
            contact_id=contact_id,
        )

    async def get_household_async(self, contact_id: UUID) -> list | HTTPValidationError | None:
        """Async version of get_household()."""
        from personal_crm_client.api.contacts.contacts_get_contact_household import asyncio

        return await asyncio(
            client=self._client,
            contact_id=contact_id,
        )
