from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.http_validation_error import HTTPValidationError
from ...models.ok import Ok
from typing import cast
from uuid import UUID


def _get_kwargs(
    interaction_id: UUID,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "delete",
        "url": "/api/v1/interactions/{interaction_id}".format(
            interaction_id=quote(str(interaction_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> HTTPValidationError | Ok | None:
    if response.status_code == 200:
        response_200 = Ok.from_dict(response.json())

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
) -> Response[HTTPValidationError | Ok]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    interaction_id: UUID,
    *,
    client: AuthenticatedClient,
) -> Response[HTTPValidationError | Ok]:
    """Delete Interaction

     Soft-delete an interaction by setting deleted_at.

    Args:
        interaction_id (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | Ok]
    """

    kwargs = _get_kwargs(
        interaction_id=interaction_id,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    interaction_id: UUID,
    *,
    client: AuthenticatedClient,
) -> HTTPValidationError | Ok | None:
    """Delete Interaction

     Soft-delete an interaction by setting deleted_at.

    Args:
        interaction_id (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | Ok
    """

    return sync_detailed(
        interaction_id=interaction_id,
        client=client,
    ).parsed


async def asyncio_detailed(
    interaction_id: UUID,
    *,
    client: AuthenticatedClient,
) -> Response[HTTPValidationError | Ok]:
    """Delete Interaction

     Soft-delete an interaction by setting deleted_at.

    Args:
        interaction_id (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | Ok]
    """

    kwargs = _get_kwargs(
        interaction_id=interaction_id,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    interaction_id: UUID,
    *,
    client: AuthenticatedClient,
) -> HTTPValidationError | Ok | None:
    """Delete Interaction

     Soft-delete an interaction by setting deleted_at.

    Args:
        interaction_id (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | Ok
    """

    return (
        await asyncio_detailed(
            interaction_id=interaction_id,
            client=client,
        )
    ).parsed
