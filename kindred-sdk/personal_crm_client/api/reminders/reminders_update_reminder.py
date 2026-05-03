from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.http_validation_error import HTTPValidationError
from ...models.reminder_public import ReminderPublic
from ...models.reminder_update import ReminderUpdate
from typing import cast
from uuid import UUID



def _get_kwargs(
    reminder_id: UUID,
    *,
    body: ReminderUpdate,

) -> dict[str, Any]:
    headers: dict[str, Any] = {}


    

    

    _kwargs: dict[str, Any] = {
        "method": "patch",
        "url": "/api/v1/reminders/{reminder_id}".format(reminder_id=quote(str(reminder_id), safe=""),),
    }

    _kwargs["json"] = body.to_dict()


    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs



def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> HTTPValidationError | ReminderPublic | None:
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


def _build_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Response[HTTPValidationError | ReminderPublic]:
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
    body: ReminderUpdate,

) -> Response[HTTPValidationError | ReminderPublic]:
    """ Update Reminder

     Update a reminder.

    Args:
        reminder_id (UUID):
        body (ReminderUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | ReminderPublic]
     """


    kwargs = _get_kwargs(
        reminder_id=reminder_id,
body=body,

    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)

def sync(
    reminder_id: UUID,
    *,
    client: AuthenticatedClient,
    body: ReminderUpdate,

) -> HTTPValidationError | ReminderPublic | None:
    """ Update Reminder

     Update a reminder.

    Args:
        reminder_id (UUID):
        body (ReminderUpdate):

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

    ).parsed

async def asyncio_detailed(
    reminder_id: UUID,
    *,
    client: AuthenticatedClient,
    body: ReminderUpdate,

) -> Response[HTTPValidationError | ReminderPublic]:
    """ Update Reminder

     Update a reminder.

    Args:
        reminder_id (UUID):
        body (ReminderUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | ReminderPublic]
     """


    kwargs = _get_kwargs(
        reminder_id=reminder_id,
body=body,

    )

    response = await client.get_async_httpx_client().request(
        **kwargs
    )

    return _build_response(client=client, response=response)

async def asyncio(
    reminder_id: UUID,
    *,
    client: AuthenticatedClient,
    body: ReminderUpdate,

) -> HTTPValidationError | ReminderPublic | None:
    """ Update Reminder

     Update a reminder.

    Args:
        reminder_id (UUID):
        body (ReminderUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | ReminderPublic
     """


    return (await asyncio_detailed(
        reminder_id=reminder_id,
client=client,
body=body,

    )).parsed
