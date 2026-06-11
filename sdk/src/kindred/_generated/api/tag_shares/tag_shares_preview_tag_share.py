from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.http_validation_error import HTTPValidationError
from ...models.tag_share_preview import TagSharePreview
from typing import cast
from uuid import UUID


def _get_kwargs(
    tag_id: UUID,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/v1/tag-shares/preview/{tag_id}".format(
            tag_id=quote(str(tag_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> HTTPValidationError | TagSharePreview | None:
    if response.status_code == 200:
        response_200 = TagSharePreview.from_dict(response.json())

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
) -> Response[HTTPValidationError | TagSharePreview]:
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
) -> Response[HTTPValidationError | TagSharePreview]:
    """Preview Tag Share

     Preview the scope of sharing a tag - counts of all related entities.

    Args:
        tag_id (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | TagSharePreview]
    """

    kwargs = _get_kwargs(
        tag_id=tag_id,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    tag_id: UUID,
    *,
    client: AuthenticatedClient,
) -> HTTPValidationError | TagSharePreview | None:
    """Preview Tag Share

     Preview the scope of sharing a tag - counts of all related entities.

    Args:
        tag_id (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | TagSharePreview
    """

    return sync_detailed(
        tag_id=tag_id,
        client=client,
    ).parsed


async def asyncio_detailed(
    tag_id: UUID,
    *,
    client: AuthenticatedClient,
) -> Response[HTTPValidationError | TagSharePreview]:
    """Preview Tag Share

     Preview the scope of sharing a tag - counts of all related entities.

    Args:
        tag_id (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | TagSharePreview]
    """

    kwargs = _get_kwargs(
        tag_id=tag_id,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    tag_id: UUID,
    *,
    client: AuthenticatedClient,
) -> HTTPValidationError | TagSharePreview | None:
    """Preview Tag Share

     Preview the scope of sharing a tag - counts of all related entities.

    Args:
        tag_id (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | TagSharePreview
    """

    return (
        await asyncio_detailed(
            tag_id=tag_id,
            client=client,
        )
    ).parsed
