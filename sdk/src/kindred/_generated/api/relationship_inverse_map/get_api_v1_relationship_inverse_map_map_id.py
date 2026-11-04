from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.http_validation_error import HTTPValidationError
from ...models.inverse_relationship_map_public import InverseRelationshipMapPublic
from typing import cast
from uuid import UUID


def _get_kwargs(
    map_id: UUID,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/v1/relationship-inverse-map/{map_id}".format(
            map_id=quote(str(map_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> HTTPValidationError | InverseRelationshipMapPublic | None:
    if response.status_code == 200:
        response_200 = InverseRelationshipMapPublic.from_dict(response.json())

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
) -> Response[HTTPValidationError | InverseRelationshipMapPublic]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    map_id: UUID,
    *,
    client: AuthenticatedClient | Client,
) -> Response[HTTPValidationError | InverseRelationshipMapPublic]:
    """Get Inverse Map

     Get a single mapping by ID.

    Args:
        map_id (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | InverseRelationshipMapPublic]
    """

    kwargs = _get_kwargs(
        map_id=map_id,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    map_id: UUID,
    *,
    client: AuthenticatedClient | Client,
) -> HTTPValidationError | InverseRelationshipMapPublic | None:
    """Get Inverse Map

     Get a single mapping by ID.

    Args:
        map_id (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | InverseRelationshipMapPublic
    """

    return sync_detailed(
        map_id=map_id,
        client=client,
    ).parsed


async def asyncio_detailed(
    map_id: UUID,
    *,
    client: AuthenticatedClient | Client,
) -> Response[HTTPValidationError | InverseRelationshipMapPublic]:
    """Get Inverse Map

     Get a single mapping by ID.

    Args:
        map_id (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | InverseRelationshipMapPublic]
    """

    kwargs = _get_kwargs(
        map_id=map_id,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    map_id: UUID,
    *,
    client: AuthenticatedClient | Client,
) -> HTTPValidationError | InverseRelationshipMapPublic | None:
    """Get Inverse Map

     Get a single mapping by ID.

    Args:
        map_id (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | InverseRelationshipMapPublic
    """

    return (
        await asyncio_detailed(
            map_id=map_id,
            client=client,
        )
    ).parsed
