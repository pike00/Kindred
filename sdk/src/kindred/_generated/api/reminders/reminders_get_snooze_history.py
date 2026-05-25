from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.http_validation_error import HTTPValidationError
from ...models.reminder_snooze_history_entry import ReminderSnoozeHistoryEntry
from typing import cast
from uuid import UUID


def _get_kwargs(
    reminder_id: UUID,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/v1/reminders/{reminder_id}/snooze-history".format(
            reminder_id=quote(str(reminder_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> HTTPValidationError | list[ReminderSnoozeHistoryEntry] | None:
    if response.status_code == 200:
        response_200 = []
        _response_200 = response.json()
        for response_200_item_data in _response_200:
            response_200_item = ReminderSnoozeHistoryEntry.from_dict(response_200_item_data)

            response_200.append(response_200_item)

        return response_200

    if response.status_code == 422:
        response_422 = HTTPValidationError.from_dict(response.json())

        return response_422

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[HTTPValidationError | list[ReminderSnoozeHistoryEntry]]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    reminder_id: UUID,
    *,
    client: AuthenticatedClient,
) -> Response[HTTPValidationError | list[ReminderSnoozeHistoryEntry]]:
    """Get Snooze History

     Get snooze history for a reminder.

    Args:
        reminder_id (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | list[ReminderSnoozeHistoryEntry]]
    """

    kwargs = _get_kwargs(
        reminder_id=reminder_id,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    reminder_id: UUID,
    *,
    client: AuthenticatedClient,
) -> HTTPValidationError | list[ReminderSnoozeHistoryEntry] | None:
    """Get Snooze History

     Get snooze history for a reminder.

    Args:
        reminder_id (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | list[ReminderSnoozeHistoryEntry]
    """

    return sync_detailed(
        reminder_id=reminder_id,
        client=client,
    ).parsed


async def asyncio_detailed(
    reminder_id: UUID,
    *,
    client: AuthenticatedClient,
) -> Response[HTTPValidationError | list[ReminderSnoozeHistoryEntry]]:
    """Get Snooze History

     Get snooze history for a reminder.

    Args:
        reminder_id (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | list[ReminderSnoozeHistoryEntry]]
    """

    kwargs = _get_kwargs(
        reminder_id=reminder_id,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    reminder_id: UUID,
    *,
    client: AuthenticatedClient,
) -> HTTPValidationError | list[ReminderSnoozeHistoryEntry] | None:
    """Get Snooze History

     Get snooze history for a reminder.

    Args:
        reminder_id (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | list[ReminderSnoozeHistoryEntry]
    """

    return (
        await asyncio_detailed(
            reminder_id=reminder_id,
            client=client,
        )
    ).parsed
