from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.http_validation_error import HTTPValidationError
from ...models.inverse_relationship_map_create import InverseRelationshipMapCreate
from ...models.inverse_relationship_map_public import InverseRelationshipMapPublic
from typing import cast


def _get_kwargs(
    *,
    body: InverseRelationshipMapCreate,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/api/v1/relationship-inverse-map/",
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
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
    *,
    client: AuthenticatedClient,
    body: InverseRelationshipMapCreate,
) -> Response[HTTPValidationError | InverseRelationshipMapPublic]:
    """Create Inverse Map

     Add or update a relationship type → inverse mapping.

    Args:
        body (InverseRelationshipMapCreate): Create schema for inverse relationship map.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | InverseRelationshipMapPublic]
    """

    kwargs = _get_kwargs(
        body=body,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient,
    body: InverseRelationshipMapCreate,
) -> HTTPValidationError | InverseRelationshipMapPublic | None:
    """Create Inverse Map

     Add or update a relationship type → inverse mapping.

    Args:
        body (InverseRelationshipMapCreate): Create schema for inverse relationship map.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | InverseRelationshipMapPublic
    """

    return sync_detailed(
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient,
    body: InverseRelationshipMapCreate,
) -> Response[HTTPValidationError | InverseRelationshipMapPublic]:
    """Create Inverse Map

     Add or update a relationship type → inverse mapping.

    Args:
        body (InverseRelationshipMapCreate): Create schema for inverse relationship map.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | InverseRelationshipMapPublic]
    """

    kwargs = _get_kwargs(
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient,
    body: InverseRelationshipMapCreate,
) -> HTTPValidationError | InverseRelationshipMapPublic | None:
    """Create Inverse Map

     Add or update a relationship type → inverse mapping.

    Args:
        body (InverseRelationshipMapCreate): Create schema for inverse relationship map.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | InverseRelationshipMapPublic
    """

    return (
        await asyncio_detailed(
            client=client,
            body=body,
        )
    ).parsed
