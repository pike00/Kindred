from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.http_validation_error import HTTPValidationError
from ...models.saved_filter_public import SavedFilterPublic
from ...models.saved_filter_update import SavedFilterUpdate
from typing import cast
from uuid import UUID


def _get_kwargs(
    filter_id: UUID,
    *,
    body: SavedFilterUpdate,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "patch",
        "url": "/api/v1/saved-filters/{filter_id}".format(
            filter_id=quote(str(filter_id), safe=""),
        ),
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> HTTPValidationError | SavedFilterPublic | None:
    if response.status_code == 200:
        response_200 = SavedFilterPublic.from_dict(response.json())

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
) -> Response[HTTPValidationError | SavedFilterPublic]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    filter_id: UUID,
    *,
    client: AuthenticatedClient,
    body: SavedFilterUpdate,
) -> Response[HTTPValidationError | SavedFilterPublic]:
    """Update Saved Filter Route

     Update a saved filter.

    Args:
        filter_id (UUID):
        body (SavedFilterUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | SavedFilterPublic]
    """

    kwargs = _get_kwargs(
        filter_id=filter_id,
        body=body,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    filter_id: UUID,
    *,
    client: AuthenticatedClient,
    body: SavedFilterUpdate,
) -> HTTPValidationError | SavedFilterPublic | None:
    """Update Saved Filter Route

     Update a saved filter.

    Args:
        filter_id (UUID):
        body (SavedFilterUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | SavedFilterPublic
    """

    return sync_detailed(
        filter_id=filter_id,
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    filter_id: UUID,
    *,
    client: AuthenticatedClient,
    body: SavedFilterUpdate,
) -> Response[HTTPValidationError | SavedFilterPublic]:
    """Update Saved Filter Route

     Update a saved filter.

    Args:
        filter_id (UUID):
        body (SavedFilterUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | SavedFilterPublic]
    """

    kwargs = _get_kwargs(
        filter_id=filter_id,
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    filter_id: UUID,
    *,
    client: AuthenticatedClient,
    body: SavedFilterUpdate,
) -> HTTPValidationError | SavedFilterPublic | None:
    """Update Saved Filter Route

     Update a saved filter.

    Args:
        filter_id (UUID):
        body (SavedFilterUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | SavedFilterPublic
    """

    return (
        await asyncio_detailed(
            filter_id=filter_id,
            client=client,
            body=body,
        )
    ).parsed
