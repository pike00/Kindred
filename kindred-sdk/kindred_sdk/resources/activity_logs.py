"""Activity logs resource for Kindred SDK."""

from personal_crm_client import AuthenticatedClient, Client
from personal_crm_client.models import (
    ActivityLogPublic,
    ActivityLogsPublic,
    HTTPValidationError,
)

from typing import Optional


class ActivityLogsResource:
    """Resource for reading activity logs (read-only)."""

    def __init__(self, client: AuthenticatedClient | Client) -> None:
        self._client = client

    def list(
        self,
        *,
        skip: int = 0,
        limit: int = 100,
        contact_id: Optional[str] = None,
    ) -> ActivityLogsPublic | HTTPValidationError | None:
        """List activity logs."""
        from personal_crm_client.api.activity_logs.activity_logs_list_activity_logs import sync

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
        contact_id: Optional[str] = None,
    ) -> ActivityLogsPublic | HTTPValidationError | None:
        """Async version of list()."""
        from personal_crm_client.api.activity_logs.activity_logs_list_activity_logs import asyncio

        return await asyncio(
            client=self._client,
            skip=skip,
            limit=limit,
            contact_id=contact_id,
        )
