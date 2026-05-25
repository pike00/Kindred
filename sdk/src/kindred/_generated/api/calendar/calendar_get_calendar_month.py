from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.calendar_month_response import CalendarMonthResponse
from ...models.http_validation_error import HTTPValidationError
from typing import cast


def _get_kwargs(
    yyyy_mm: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/v1/calendar/month/{yyyy_mm}".format(
            yyyy_mm=quote(str(yyyy_mm), safe=""),
        ),
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> CalendarMonthResponse | HTTPValidationError | None:
    if response.status_code == 200:
        response_200 = CalendarMonthResponse.from_dict(response.json())

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
) -> Response[CalendarMonthResponse | HTTPValidationError]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    yyyy_mm: str,
    *,
    client: AuthenticatedClient,
) -> Response[CalendarMonthResponse | HTTPValidationError]:
    """Get Calendar Month

    Args:
        yyyy_mm (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[CalendarMonthResponse | HTTPValidationError]
    """

    kwargs = _get_kwargs(
        yyyy_mm=yyyy_mm,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    yyyy_mm: str,
    *,
    client: AuthenticatedClient,
) -> CalendarMonthResponse | HTTPValidationError | None:
    """Get Calendar Month

    Args:
        yyyy_mm (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        CalendarMonthResponse | HTTPValidationError
    """

    return sync_detailed(
        yyyy_mm=yyyy_mm,
        client=client,
    ).parsed


async def asyncio_detailed(
    yyyy_mm: str,
    *,
    client: AuthenticatedClient,
) -> Response[CalendarMonthResponse | HTTPValidationError]:
    """Get Calendar Month

    Args:
        yyyy_mm (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[CalendarMonthResponse | HTTPValidationError]
    """

    kwargs = _get_kwargs(
        yyyy_mm=yyyy_mm,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    yyyy_mm: str,
    *,
    client: AuthenticatedClient,
) -> CalendarMonthResponse | HTTPValidationError | None:
    """Get Calendar Month

    Args:
        yyyy_mm (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        CalendarMonthResponse | HTTPValidationError
    """

    return (
        await asyncio_detailed(
            yyyy_mm=yyyy_mm,
            client=client,
        )
    ).parsed
