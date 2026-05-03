from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.http_validation_error import HTTPValidationError
from ...types import UNSET, Unset
from typing import cast
from uuid import UUID



def _get_kwargs(
    reminder_id: UUID,
    *,
    minutes: int | Unset = 30,

) -> dict[str, Any]:
    

    

    params: dict[str, Any] = {}

    params["minutes"] = minutes


    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}


    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/api/v1/reminders/{reminder_id}/snooze".format(reminder_id=quote(str(reminder_id), safe=""),),
        "params": params,
    }


    return _kwargs



def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Any | HTTPValidationError | None:
    if response.status_code == 200:
        response_200 = response.json()
        return response_200

    if response.status_code == 422:
        response_422 = HTTPValidationError.from_dict(response.json())



        return response_422

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Response[Any | HTTPValidationError]:
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
    minutes: int | Unset = 30,

) -> Response[Any | HTTPValidationError]:
    """ Snooze Reminder

     Snooze a reminder.

    Args:
        reminder_id (UUID):
        minutes (int | Unset):  Default: 30.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | HTTPValidationError]
     """


    kwargs = _get_kwargs(
        reminder_id=reminder_id,
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
    minutes: int | Unset = 30,

) -> Any | HTTPValidationError | None:
    """ Snooze Reminder

     Snooze a reminder.

    Args:
        reminder_id (UUID):
        minutes (int | Unset):  Default: 30.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | HTTPValidationError
     """


    return sync_detailed(
        reminder_id=reminder_id,
client=client,
minutes=minutes,

    ).parsed

async def asyncio_detailed(
    reminder_id: UUID,
    *,
    client: AuthenticatedClient,
    minutes: int | Unset = 30,

) -> Response[Any | HTTPValidationError]:
    """ Snooze Reminder

     Snooze a reminder.

    Args:
        reminder_id (UUID):
        minutes (int | Unset):  Default: 30.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | HTTPValidationError]
     """


    kwargs = _get_kwargs(
        reminder_id=reminder_id,
minutes=minutes,

    )

    response = await client.get_async_httpx_client().request(
        **kwargs
    )

    return _build_response(client=client, response=response)

async def asyncio(
    reminder_id: UUID,
    *,
    client: AuthenticatedClient,
    minutes: int | Unset = 30,

) -> Any | HTTPValidationError | None:
    """ Snooze Reminder

     Snooze a reminder.

    Args:
        reminder_id (UUID):
        minutes (int | Unset):  Default: 30.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | HTTPValidationError
     """


    return (await asyncio_detailed(
        reminder_id=reminder_id,
client=client,
minutes=minutes,

    )).parsed
