from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.contacts_geo_response import ContactsGeoResponse
from ...models.http_validation_error import HTTPValidationError
from ...types import UNSET, Unset
from typing import cast


def _get_kwargs(
    *,
    min_lat: float | None | Unset = UNSET,
    max_lat: float | None | Unset = UNSET,
    min_lng: float | None | Unset = UNSET,
    max_lng: float | None | Unset = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    json_min_lat: float | None | Unset
    if isinstance(min_lat, Unset):
        json_min_lat = UNSET
    else:
        json_min_lat = min_lat
    params["min_lat"] = json_min_lat

    json_max_lat: float | None | Unset
    if isinstance(max_lat, Unset):
        json_max_lat = UNSET
    else:
        json_max_lat = max_lat
    params["max_lat"] = json_max_lat

    json_min_lng: float | None | Unset
    if isinstance(min_lng, Unset):
        json_min_lng = UNSET
    else:
        json_min_lng = min_lng
    params["min_lng"] = json_min_lng

    json_max_lng: float | None | Unset
    if isinstance(max_lng, Unset):
        json_max_lng = UNSET
    else:
        json_max_lng = max_lng
    params["max_lng"] = json_max_lng

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/v1/contacts/geo",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> ContactsGeoResponse | HTTPValidationError | None:
    if response.status_code == 200:
        response_200 = ContactsGeoResponse.from_dict(response.json())

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
) -> Response[ContactsGeoResponse | HTTPValidationError]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient,
    min_lat: float | None | Unset = UNSET,
    max_lat: float | None | Unset = UNSET,
    min_lng: float | None | Unset = UNSET,
    max_lng: float | None | Unset = UNSET,
) -> Response[ContactsGeoResponse | HTTPValidationError]:
    """List Contacts Geo

     List contacts with geographic coordinates for map visualization.

    Returns contacts that have addresses with valid latitude/longitude.
    Supports optional bounding box filtering.
    Respects tag-share visibility rules.

    Args:
        min_lat (float | None | Unset): Minimum latitude for bounding box filter
        max_lat (float | None | Unset): Maximum latitude for bounding box filter
        min_lng (float | None | Unset): Minimum longitude for bounding box filter
        max_lng (float | None | Unset): Maximum longitude for bounding box filter

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[ContactsGeoResponse | HTTPValidationError]
    """

    kwargs = _get_kwargs(
        min_lat=min_lat,
        max_lat=max_lat,
        min_lng=min_lng,
        max_lng=max_lng,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient,
    min_lat: float | None | Unset = UNSET,
    max_lat: float | None | Unset = UNSET,
    min_lng: float | None | Unset = UNSET,
    max_lng: float | None | Unset = UNSET,
) -> ContactsGeoResponse | HTTPValidationError | None:
    """List Contacts Geo

     List contacts with geographic coordinates for map visualization.

    Returns contacts that have addresses with valid latitude/longitude.
    Supports optional bounding box filtering.
    Respects tag-share visibility rules.

    Args:
        min_lat (float | None | Unset): Minimum latitude for bounding box filter
        max_lat (float | None | Unset): Maximum latitude for bounding box filter
        min_lng (float | None | Unset): Minimum longitude for bounding box filter
        max_lng (float | None | Unset): Maximum longitude for bounding box filter

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ContactsGeoResponse | HTTPValidationError
    """

    return sync_detailed(
        client=client,
        min_lat=min_lat,
        max_lat=max_lat,
        min_lng=min_lng,
        max_lng=max_lng,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient,
    min_lat: float | None | Unset = UNSET,
    max_lat: float | None | Unset = UNSET,
    min_lng: float | None | Unset = UNSET,
    max_lng: float | None | Unset = UNSET,
) -> Response[ContactsGeoResponse | HTTPValidationError]:
    """List Contacts Geo

     List contacts with geographic coordinates for map visualization.

    Returns contacts that have addresses with valid latitude/longitude.
    Supports optional bounding box filtering.
    Respects tag-share visibility rules.

    Args:
        min_lat (float | None | Unset): Minimum latitude for bounding box filter
        max_lat (float | None | Unset): Maximum latitude for bounding box filter
        min_lng (float | None | Unset): Minimum longitude for bounding box filter
        max_lng (float | None | Unset): Maximum longitude for bounding box filter

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[ContactsGeoResponse | HTTPValidationError]
    """

    kwargs = _get_kwargs(
        min_lat=min_lat,
        max_lat=max_lat,
        min_lng=min_lng,
        max_lng=max_lng,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient,
    min_lat: float | None | Unset = UNSET,
    max_lat: float | None | Unset = UNSET,
    min_lng: float | None | Unset = UNSET,
    max_lng: float | None | Unset = UNSET,
) -> ContactsGeoResponse | HTTPValidationError | None:
    """List Contacts Geo

     List contacts with geographic coordinates for map visualization.

    Returns contacts that have addresses with valid latitude/longitude.
    Supports optional bounding box filtering.
    Respects tag-share visibility rules.

    Args:
        min_lat (float | None | Unset): Minimum latitude for bounding box filter
        max_lat (float | None | Unset): Maximum latitude for bounding box filter
        min_lng (float | None | Unset): Minimum longitude for bounding box filter
        max_lng (float | None | Unset): Maximum longitude for bounding box filter

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ContactsGeoResponse | HTTPValidationError
    """

    return (
        await asyncio_detailed(
            client=client,
            min_lat=min_lat,
            max_lat=max_lat,
            min_lng=min_lng,
            max_lng=max_lng,
        )
    ).parsed
