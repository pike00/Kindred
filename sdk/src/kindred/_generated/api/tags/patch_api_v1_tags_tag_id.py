from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.http_validation_error import HTTPValidationError
from ...models.tag_public import TagPublic
from ...models.tag_update import TagUpdate
from typing import cast
from uuid import UUID


def _get_kwargs(
    tag_id: UUID,
    *,
    body: TagUpdate,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "patch",
        "url": "/api/v1/tags/{tag_id}".format(
            tag_id=quote(str(tag_id), safe=""),
        ),
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> HTTPValidationError | TagPublic | None:
    if response.status_code == 200:
        response_200 = TagPublic.from_dict(response.json())

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
) -> Response[HTTPValidationError | TagPublic]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    tag_id: UUID,
    *,
    client: AuthenticatedClient,
    body: TagUpdate,
) -> Response[HTTPValidationError | TagPublic]:
    """Update Tag

     Update a tag.

    Args:
        tag_id (UUID):
        body (TagUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | TagPublic]
    """

    kwargs = _get_kwargs(
        tag_id=tag_id,
        body=body,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    tag_id: UUID,
    *,
    client: AuthenticatedClient,
    body: TagUpdate,
) -> HTTPValidationError | TagPublic | None:
    """Update Tag

     Update a tag.

    Args:
        tag_id (UUID):
        body (TagUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | TagPublic
    """

    return sync_detailed(
        tag_id=tag_id,
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    tag_id: UUID,
    *,
    client: AuthenticatedClient,
    body: TagUpdate,
) -> Response[HTTPValidationError | TagPublic]:
    """Update Tag

     Update a tag.

    Args:
        tag_id (UUID):
        body (TagUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | TagPublic]
    """

    kwargs = _get_kwargs(
        tag_id=tag_id,
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    tag_id: UUID,
    *,
    client: AuthenticatedClient,
    body: TagUpdate,
) -> HTTPValidationError | TagPublic | None:
    """Update Tag

     Update a tag.

    Args:
        tag_id (UUID):
        body (TagUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | TagPublic
    """

    return (
        await asyncio_detailed(
            tag_id=tag_id,
            client=client,
            body=body,
        )
    ).parsed
