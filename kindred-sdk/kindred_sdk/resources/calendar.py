"""Calendar resource for Kindred SDK."""

from personal_crm_client import AuthenticatedClient, Client
from personal_crm_client.models import (
    CalendarMonthResponse,
    HTTPValidationError,
)


class CalendarResource:
    """Resource for calendar operations."""

    def __init__(self, client: AuthenticatedClient | Client) -> None:
        self._client = client

    def get_month(self, *, year: int, month: int) -> CalendarMonthResponse | HTTPValidationError | None:
        """Get calendar data for a specific month."""
        from personal_crm_client.api.calendar.calendar_get_calendar_month import sync

        return sync(
            client=self._client,
            year=year,
            month=month,
        )

    async def get_month_async(self, *, year: int, month: int) -> CalendarMonthResponse | HTTPValidationError | None:
        """Async version of get_month()."""
        from personal_crm_client.api.calendar.calendar_get_calendar_month import asyncio

        return await asyncio(
            client=self._client,
            year=year,
            month=month,
        )
