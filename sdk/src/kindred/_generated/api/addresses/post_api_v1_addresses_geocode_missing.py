from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.post_api_v1_addresses_geocode_missing_response_post_api_v1_addresses_geocode_missing import (
    PostApiV1AddressesGeocodeMissingResponsePostApiV1AddressesGeocodeMissing,
)
from typing import cast


def _get_kwargs() -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/api/v1/addresses/geocode-missing",
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> PostApiV1AddressesGeocodeMissingResponsePostApiV1AddressesGeocodeMissing | None:
    if response.status_code == 200:
        response_200 = PostApiV1AddressesGeocodeMissingResponsePostApiV1AddressesGeocodeMissing.from_dict(
            response.json()
        )

        return response_200

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[PostApiV1AddressesGeocodeMissingResponsePostApiV1AddressesGeocodeMissing]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient,
) -> Response[PostApiV1AddressesGeocodeMissingResponsePostApiV1AddressesGeocodeMissing]:
    """Geocode Missing Coordinates

     Trigger geocoding for all addresses missing coordinates (owned by user).

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[PostApiV1AddressesGeocodeMissingResponsePostApiV1AddressesGeocodeMissing]
    """

    kwargs = _get_kwargs()

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient,
) -> PostApiV1AddressesGeocodeMissingResponsePostApiV1AddressesGeocodeMissing | None:
    """Geocode Missing Coordinates

     Trigger geocoding for all addresses missing coordinates (owned by user).

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        PostApiV1AddressesGeocodeMissingResponsePostApiV1AddressesGeocodeMissing
    """

    return sync_detailed(
        client=client,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient,
) -> Response[PostApiV1AddressesGeocodeMissingResponsePostApiV1AddressesGeocodeMissing]:
    """Geocode Missing Coordinates

     Trigger geocoding for all addresses missing coordinates (owned by user).

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[PostApiV1AddressesGeocodeMissingResponsePostApiV1AddressesGeocodeMissing]
    """

    kwargs = _get_kwargs()

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient,
) -> PostApiV1AddressesGeocodeMissingResponsePostApiV1AddressesGeocodeMissing | None:
    """Geocode Missing Coordinates

     Trigger geocoding for all addresses missing coordinates (owned by user).

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        PostApiV1AddressesGeocodeMissingResponsePostApiV1AddressesGeocodeMissing
    """

    return (
        await asyncio_detailed(
            client=client,
        )
    ).parsed
