from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.http_validation_error import HTTPValidationError
from ...models.interaction_public import InteractionPublic
from ...models.interaction_update import InteractionUpdate
from typing import cast
from uuid import UUID


def _get_kwargs(
    interaction_id: UUID,
    *,
    body: InteractionUpdate,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "patch",
        "url": "/api/v1/interactions/{interaction_id}".format(
            interaction_id=quote(str(interaction_id), safe=""),
        ),
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> HTTPValidationError | InteractionPublic | None:
    if response.status_code == 200:
        response_200 = InteractionPublic.from_dict(response.json())

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
) -> Response[HTTPValidationError | InteractionPublic]:
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
    body: InteractionUpdate,
) -> Response[HTTPValidationError | InteractionPublic]:
    """Update Interaction

     Update an interaction; ``attendee_ids`` replaces the attendee set.

    Args:
        interaction_id (UUID):
        body (InteractionUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | InteractionPublic]
    """

    kwargs = _get_kwargs(
        interaction_id=interaction_id,
        body=body,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    interaction_id: UUID,
    *,
    client: AuthenticatedClient,
    body: InteractionUpdate,
) -> HTTPValidationError | InteractionPublic | None:
    """Update Interaction

     Update an interaction; ``attendee_ids`` replaces the attendee set.

    Args:
        interaction_id (UUID):
        body (InteractionUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | InteractionPublic
    """

    return sync_detailed(
        interaction_id=interaction_id,
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    interaction_id: UUID,
    *,
    client: AuthenticatedClient,
    body: InteractionUpdate,
) -> Response[HTTPValidationError | InteractionPublic]:
    """Update Interaction

     Update an interaction; ``attendee_ids`` replaces the attendee set.

    Args:
        interaction_id (UUID):
        body (InteractionUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | InteractionPublic]
    """

    kwargs = _get_kwargs(
        interaction_id=interaction_id,
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    interaction_id: UUID,
    *,
    client: AuthenticatedClient,
    body: InteractionUpdate,
) -> HTTPValidationError | InteractionPublic | None:
    """Update Interaction

     Update an interaction; ``attendee_ids`` replaces the attendee set.

    Args:
        interaction_id (UUID):
        body (InteractionUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | InteractionPublic
    """

    return (
        await asyncio_detailed(
            interaction_id=interaction_id,
            client=client,
            body=body,
        )
    ).parsed
