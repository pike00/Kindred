from http import HTTPStatus
from typing import Any
from uuid import UUID

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.http_validation_error import HTTPValidationError
from ...models.tag_shares_public import TagSharesPublic
from ...types import UNSET, Response


def _get_kwargs(
    *,
    tag_id: UUID,
) -> dict[str, Any]:
    params: dict[str, Any] = {}

    json_tag_id = str(tag_id)
    params["tag_id"] = json_tag_id

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/v1/tag-shares/",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> HTTPValidationError | TagSharesPublic | None:
    if response.status_code == 200:
        response_200 = TagSharesPublic.from_dict(response.json())

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
) -> Response[HTTPValidationError | TagSharesPublic]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient,
    tag_id: UUID,
) -> Response[HTTPValidationError | TagSharesPublic]:
    """List Tag Shares

    Args:
        tag_id (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | TagSharesPublic]
    """

    kwargs = _get_kwargs(
        tag_id=tag_id,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient,
    tag_id: UUID,
) -> HTTPValidationError | TagSharesPublic | None:
    """List Tag Shares

    Args:
        tag_id (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | TagSharesPublic
    """

    return sync_detailed(
        client=client,
        tag_id=tag_id,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient,
    tag_id: UUID,
) -> Response[HTTPValidationError | TagSharesPublic]:
    """List Tag Shares

    Args:
        tag_id (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | TagSharesPublic]
    """

    kwargs = _get_kwargs(
        tag_id=tag_id,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient,
    tag_id: UUID,
) -> HTTPValidationError | TagSharesPublic | None:
    """List Tag Shares

    Args:
        tag_id (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | TagSharesPublic
    """

    return (
        await asyncio_detailed(
            client=client,
            tag_id=tag_id,
        )
    ).parsed
