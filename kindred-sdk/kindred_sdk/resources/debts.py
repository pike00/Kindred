"""Debts resource for Kindred SDK."""

from uuid import UUID

from personal_crm_client import AuthenticatedClient, Client
from personal_crm_client.models import (
    DebtCreate,
    DebtPublic,
    DebtsPublic,
    DebtUpdate,
    HTTPValidationError,
)


class DebtsResource:
    """Resource for managing debts."""

    def __init__(self, client: AuthenticatedClient | Client) -> None:
        self._client = client

    def list(
        self,
        *,
        skip: int = 0,
        limit: int = 100,
        contact_id: UUID | None = None,
    ) -> DebtsPublic | HTTPValidationError | None:
        """List debts."""
        from personal_crm_client.api.debts.debts_list_debts import sync

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
    ) -> DebtsPublic | HTTPValidationError | None:
        """Async version of list()."""
        from personal_crm_client.api.debts.debts_list_debts import asyncio

        return await asyncio(
            client=self._client,
            skip=skip,
            limit=limit,
            contact_id=contact_id,
        )

    def get(self, debt_id: UUID) -> DebtPublic | HTTPValidationError | None:
        """Get a single debt by ID."""

        debts = self.list()
        if debts and hasattr(debts, "data"):
            for debt in debts.data:
                if debt.id == debt_id:
                    return debt
        return None

    def create(self, item: DebtCreate) -> DebtPublic | HTTPValidationError | None:
        """Create a new debt."""
        from personal_crm_client.api.debts.debts_create_debt_route import sync

        return sync(client=self._client, body=item)

    async def create_async(self, item: DebtCreate) -> DebtPublic | HTTPValidationError | None:
        """Async version of create()."""
        from personal_crm_client.api.debts.debts_create_debt_route import asyncio

        return await asyncio(client=self._client, body=item)

    def update(self, debt_id: UUID, item: DebtUpdate) -> DebtPublic | HTTPValidationError | None:
        """Update an existing debt."""
        from personal_crm_client.api.debts.debts_update_debt import sync

        return sync(client=self._client, debt_id=debt_id, body=item)

    async def update_async(self, debt_id: UUID, item: DebtUpdate) -> DebtPublic | HTTPValidationError | None:
        """Async version of update()."""
        from personal_crm_client.api.debts.debts_update_debt import asyncio

        return await asyncio(client=self._client, debt_id=debt_id, body=item)

    def delete(self, debt_id: UUID) -> DebtPublic | HTTPValidationError | None:
        """Delete a debt."""
        from personal_crm_client.api.debts.debts_delete_debt import sync

        return sync(client=self._client, debt_id=debt_id)

    async def delete_async(self, debt_id: UUID) -> DebtPublic | HTTPValidationError | None:
        """Async version of delete()."""
        from personal_crm_client.api.debts.debts_delete_debt import asyncio

        return await asyncio(client=self._client, debt_id=debt_id)
