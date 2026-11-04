from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.http_validation_error import HTTPValidationError
from ...models.reminder_public import ReminderPublic
from ...models.reminder_snooze_request import ReminderSnoozeRequest
from ...types import UNSET, Unset
from typing import cast
from uuid import UUID


def _get_kwargs(
    reminder_id: UUID,
    *,
    body: None | ReminderSnoozeRequest | Unset = UNSET,
    minutes: int | None | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    params: dict[str, Any] = {}

    json_minutes: int | None | Unset
    if isinstance(minutes, Unset):
        json_minutes = UNSET
    else:
        json_minutes = minutes
    params["minutes"] = json_minutes

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/api/v1/reminders/{reminder_id}/snooze".format(
            reminder_id=quote(str(reminder_id), safe=""),
        ),
        "params": params,
    }

    if isinstance(body, ReminderSnoozeRequest):
        _kwargs["json"] = body.to_dict()
    else:
        _kwargs["json"] = body

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> HTTPValidationError | ReminderPublic | None:
    if response.status_code == 200:
        response_200 = ReminderPublic.from_dict(response.json())

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
) -> Response[HTTPValidationError | ReminderPublic]:
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
    body: None | ReminderSnoozeRequest | Unset = UNSET,
    minutes: int | None | Unset = UNSET,
) -> Response[HTTPValidationError | ReminderPublic]:
    """Snooze Reminder

     Snooze a reminder. Accepts JSON body with minutes/snooze_until, or minutes as query param.

    Args:
        reminder_id (UUID):
        minutes (int | None | Unset):
        body (None | ReminderSnoozeRequest | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | ReminderPublic]
    """

    kwargs = _get_kwargs(
        reminder_id=reminder_id,
        body=body,
        minutes=minutes,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    reminder_id: UUID,
    *,
    client: AuthenticatedClient,
    body: None | ReminderSnoozeRequest | Unset = UNSET,
    minutes: int | None | Unset = UNSET,
) -> HTTPValidationError | ReminderPublic | None:
    """Snooze Reminder

     Snooze a reminder. Accepts JSON body with minutes/snooze_until, or minutes as query param.

    Args:
        reminder_id (UUID):
        minutes (int | None | Unset):
        body (None | ReminderSnoozeRequest | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | ReminderPublic
    """

    return sync_detailed(
        reminder_id=reminder_id,
        client=client,
        body=body,
        minutes=minutes,
    ).parsed


async def asyncio_detailed(
    reminder_id: UUID,
    *,
    client: AuthenticatedClient,
    body: None | ReminderSnoozeRequest | Unset = UNSET,
    minutes: int | None | Unset = UNSET,
) -> Response[HTTPValidationError | ReminderPublic]:
    """Snooze Reminder

     Snooze a reminder. Accepts JSON body with minutes/snooze_until, or minutes as query param.

    Args:
        reminder_id (UUID):
        minutes (int | None | Unset):
        body (None | ReminderSnoozeRequest | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | ReminderPublic]
    """

    kwargs = _get_kwargs(
        reminder_id=reminder_id,
        body=body,
        minutes=minutes,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    reminder_id: UUID,
    *,
    client: AuthenticatedClient,
    body: None | ReminderSnoozeRequest | Unset = UNSET,
    minutes: int | None | Unset = UNSET,
) -> HTTPValidationError | ReminderPublic | None:
    """Snooze Reminder

     Snooze a reminder. Accepts JSON body with minutes/snooze_until, or minutes as query param.

    Args:
        reminder_id (UUID):
        minutes (int | None | Unset):
        body (None | ReminderSnoozeRequest | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | ReminderPublic
    """

    return (
        await asyncio_detailed(
            reminder_id=reminder_id,
            client=client,
            body=body,
            minutes=minutes,
        )
    ).parsed
