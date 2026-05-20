from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.chronic_snoozer import ChronicSnoozer
from ...models.http_validation_error import HTTPValidationError
from ...types import UNSET, Unset
from typing import cast


def _get_kwargs(
    *,
    days: int | Unset = 7,
    threshold: int | Unset = 3,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["days"] = days

    params["threshold"] = threshold

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/v1/reminders/chronic-snoozers",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> HTTPValidationError | list[ChronicSnoozer] | None:
    if response.status_code == 200:
        response_200 = []
        _response_200 = response.json()
        for response_200_item_data in _response_200:
            response_200_item = ChronicSnoozer.from_dict(response_200_item_data)

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
) -> Response[HTTPValidationError | list[ChronicSnoozer]]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient,
    days: int | Unset = 7,
    threshold: int | Unset = 3,
) -> Response[HTTPValidationError | list[ChronicSnoozer]]:
    """Get Chronic Snoozers

     Get contacts with reminders snoozed more than threshold times in N days.

    Args:
        days (int | Unset):  Default: 7.
        threshold (int | Unset):  Default: 3.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | list[ChronicSnoozer]]
    """

    kwargs = _get_kwargs(
        days=days,
        threshold=threshold,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient,
    days: int | Unset = 7,
    threshold: int | Unset = 3,
) -> HTTPValidationError | list[ChronicSnoozer] | None:
    """Get Chronic Snoozers

     Get contacts with reminders snoozed more than threshold times in N days.

    Args:
        days (int | Unset):  Default: 7.
        threshold (int | Unset):  Default: 3.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | list[ChronicSnoozer]
    """

    return sync_detailed(
        client=client,
        days=days,
        threshold=threshold,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient,
    days: int | Unset = 7,
    threshold: int | Unset = 3,
) -> Response[HTTPValidationError | list[ChronicSnoozer]]:
    """Get Chronic Snoozers

     Get contacts with reminders snoozed more than threshold times in N days.

    Args:
        days (int | Unset):  Default: 7.
        threshold (int | Unset):  Default: 3.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | list[ChronicSnoozer]]
    """

    kwargs = _get_kwargs(
        days=days,
        threshold=threshold,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient,
    days: int | Unset = 7,
    threshold: int | Unset = 3,
) -> HTTPValidationError | list[ChronicSnoozer] | None:
    """Get Chronic Snoozers

     Get contacts with reminders snoozed more than threshold times in N days.

    Args:
        days (int | Unset):  Default: 7.
        threshold (int | Unset):  Default: 3.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | list[ChronicSnoozer]
    """

    return (
        await asyncio_detailed(
            client=client,
            days=days,
            threshold=threshold,
        )
    ).parsed
