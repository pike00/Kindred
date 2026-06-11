from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.http_validation_error import HTTPValidationError
from ...models.v_card_conflict_public import VCardConflictPublic
from typing import cast
from uuid import UUID


def _get_kwargs(
    conflict_id: UUID,
    *,
    resolution_type: str,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["resolution_type"] = resolution_type

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/api/v1/vcard-conflicts/{conflict_id}/resolve".format(
            conflict_id=quote(str(conflict_id), safe=""),
        ),
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> HTTPValidationError | VCardConflictPublic | None:
    if response.status_code == 200:
        response_200 = VCardConflictPublic.from_dict(response.json())

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
) -> Response[HTTPValidationError | VCardConflictPublic]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    conflict_id: UUID,
    *,
    client: AuthenticatedClient,
    resolution_type: str,
) -> Response[HTTPValidationError | VCardConflictPublic]:
    """Resolve Vcard Conflict

     Resolve a vCard conflict by accepting remote or keeping local.

    resolution_type must be one of: 'keep_local', 'accept_remote'

    Args:
        conflict_id (UUID):
        resolution_type (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | VCardConflictPublic]
    """

    kwargs = _get_kwargs(
        conflict_id=conflict_id,
        resolution_type=resolution_type,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    conflict_id: UUID,
    *,
    client: AuthenticatedClient,
    resolution_type: str,
) -> HTTPValidationError | VCardConflictPublic | None:
    """Resolve Vcard Conflict

     Resolve a vCard conflict by accepting remote or keeping local.

    resolution_type must be one of: 'keep_local', 'accept_remote'

    Args:
        conflict_id (UUID):
        resolution_type (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | VCardConflictPublic
    """

    return sync_detailed(
        conflict_id=conflict_id,
        client=client,
        resolution_type=resolution_type,
    ).parsed


async def asyncio_detailed(
    conflict_id: UUID,
    *,
    client: AuthenticatedClient,
    resolution_type: str,
) -> Response[HTTPValidationError | VCardConflictPublic]:
    """Resolve Vcard Conflict

     Resolve a vCard conflict by accepting remote or keeping local.

    resolution_type must be one of: 'keep_local', 'accept_remote'

    Args:
        conflict_id (UUID):
        resolution_type (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | VCardConflictPublic]
    """

    kwargs = _get_kwargs(
        conflict_id=conflict_id,
        resolution_type=resolution_type,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    conflict_id: UUID,
    *,
    client: AuthenticatedClient,
    resolution_type: str,
) -> HTTPValidationError | VCardConflictPublic | None:
    """Resolve Vcard Conflict

     Resolve a vCard conflict by accepting remote or keeping local.

    resolution_type must be one of: 'keep_local', 'accept_remote'

    Args:
        conflict_id (UUID):
        resolution_type (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | VCardConflictPublic
    """

    return (
        await asyncio_detailed(
            conflict_id=conflict_id,
            client=client,
            resolution_type=resolution_type,
        )
    ).parsed
