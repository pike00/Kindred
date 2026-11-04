from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.http_validation_error import HTTPValidationError
from ...models.relationship_public import RelationshipPublic
from ...models.relationship_update import RelationshipUpdate
from typing import cast
from uuid import UUID


def _get_kwargs(
    rel_id: UUID,
    *,
    body: RelationshipUpdate,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "patch",
        "url": "/api/v1/relationships/{rel_id}".format(
            rel_id=quote(str(rel_id), safe=""),
        ),
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> HTTPValidationError | RelationshipPublic | None:
    if response.status_code == 200:
        response_200 = RelationshipPublic.from_dict(response.json())

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
) -> Response[HTTPValidationError | RelationshipPublic]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    rel_id: UUID,
    *,
    client: AuthenticatedClient,
    body: RelationshipUpdate,
) -> Response[HTTPValidationError | RelationshipPublic]:
    """Update Relationship

     Update a relationship.

    Only the row addressed by ``rel_id`` is touched; the paired
    inverse row is left as-is so asymmetric pairs (parent/child) can
    diverge intentionally. Edit each side from its own contact page
    if you want them to stay matched.

    Args:
        rel_id (UUID):
        body (RelationshipUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | RelationshipPublic]
    """

    kwargs = _get_kwargs(
        rel_id=rel_id,
        body=body,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    rel_id: UUID,
    *,
    client: AuthenticatedClient,
    body: RelationshipUpdate,
) -> HTTPValidationError | RelationshipPublic | None:
    """Update Relationship

     Update a relationship.

    Only the row addressed by ``rel_id`` is touched; the paired
    inverse row is left as-is so asymmetric pairs (parent/child) can
    diverge intentionally. Edit each side from its own contact page
    if you want them to stay matched.

    Args:
        rel_id (UUID):
        body (RelationshipUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | RelationshipPublic
    """

    return sync_detailed(
        rel_id=rel_id,
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    rel_id: UUID,
    *,
    client: AuthenticatedClient,
    body: RelationshipUpdate,
) -> Response[HTTPValidationError | RelationshipPublic]:
    """Update Relationship

     Update a relationship.

    Only the row addressed by ``rel_id`` is touched; the paired
    inverse row is left as-is so asymmetric pairs (parent/child) can
    diverge intentionally. Edit each side from its own contact page
    if you want them to stay matched.

    Args:
        rel_id (UUID):
        body (RelationshipUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | RelationshipPublic]
    """

    kwargs = _get_kwargs(
        rel_id=rel_id,
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    rel_id: UUID,
    *,
    client: AuthenticatedClient,
    body: RelationshipUpdate,
) -> HTTPValidationError | RelationshipPublic | None:
    """Update Relationship

     Update a relationship.

    Only the row addressed by ``rel_id`` is touched; the paired
    inverse row is left as-is so asymmetric pairs (parent/child) can
    diverge intentionally. Edit each side from its own contact page
    if you want them to stay matched.

    Args:
        rel_id (UUID):
        body (RelationshipUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | RelationshipPublic
    """

    return (
        await asyncio_detailed(
            rel_id=rel_id,
            client=client,
            body=body,
        )
    ).parsed
