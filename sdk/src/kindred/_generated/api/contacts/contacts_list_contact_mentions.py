from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.http_validation_error import HTTPValidationError
from ...models.mention_public import MentionPublic
from typing import cast
from uuid import UUID


def _get_kwargs(
    contact_id: UUID,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/v1/contacts/{contact_id}/mentions".format(
            contact_id=quote(str(contact_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> HTTPValidationError | list[MentionPublic] | None:
    if response.status_code == 200:
        response_200 = []
        _response_200 = response.json()
        for response_200_item_data in _response_200:
            response_200_item = MentionPublic.from_dict(response_200_item_data)

            response_200.append(response_200_item)

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
) -> Response[HTTPValidationError | list[MentionPublic]]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    contact_id: UUID,
    *,
    client: AuthenticatedClient,
) -> Response[HTTPValidationError | list[MentionPublic]]:
    """List Contact Mentions

     Get notes where this contact is mentioned.

    Args:
        contact_id (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | list[MentionPublic]]
    """

    kwargs = _get_kwargs(
        contact_id=contact_id,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    contact_id: UUID,
    *,
    client: AuthenticatedClient,
) -> HTTPValidationError | list[MentionPublic] | None:
    """List Contact Mentions

     Get notes where this contact is mentioned.

    Args:
        contact_id (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | list[MentionPublic]
    """

    return sync_detailed(
        contact_id=contact_id,
        client=client,
    ).parsed


async def asyncio_detailed(
    contact_id: UUID,
    *,
    client: AuthenticatedClient,
) -> Response[HTTPValidationError | list[MentionPublic]]:
    """List Contact Mentions

     Get notes where this contact is mentioned.

    Args:
        contact_id (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | list[MentionPublic]]
    """

    kwargs = _get_kwargs(
        contact_id=contact_id,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    contact_id: UUID,
    *,
    client: AuthenticatedClient,
) -> HTTPValidationError | list[MentionPublic] | None:
    """List Contact Mentions

     Get notes where this contact is mentioned.

    Args:
        contact_id (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | list[MentionPublic]
    """

    return (
        await asyncio_detailed(
            contact_id=contact_id,
            client=client,
        )
    ).parsed
