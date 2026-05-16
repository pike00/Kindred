from http import HTTPStatus
from typing import Any
from uuid import UUID

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.http_validation_error import HTTPValidationError
from ...models.interactions_public import InteractionsPublic
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    contact_id: None | Unset | UUID = UNSET,
    skip: int | Unset = 0,
    limit: int | Unset = 100,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    json_contact_id: None | str | Unset
    if isinstance(contact_id, Unset):
        json_contact_id = UNSET
    elif isinstance(contact_id, UUID):
        json_contact_id = str(contact_id)
    else:
        json_contact_id = contact_id
    params["contact_id"] = json_contact_id

    params["skip"] = skip

    params["limit"] = limit

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/v1/interactions/",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> HTTPValidationError | InteractionsPublic | None:
    if response.status_code == 200:
        response_200 = InteractionsPublic.from_dict(response.json())

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
) -> Response[HTTPValidationError | InteractionsPublic]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient,
    contact_id: None | Unset | UUID = UNSET,
    skip: int | Unset = 0,
    limit: int | Unset = 100,
) -> Response[HTTPValidationError | InteractionsPublic]:
    """List Interactions

     List interactions. Pass ``contact_id`` to filter by attendee.

    Args:
        contact_id (None | Unset | UUID):
        skip (int | Unset):  Default: 0.
        limit (int | Unset):  Default: 100.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | InteractionsPublic]
    """

    kwargs = _get_kwargs(
        contact_id=contact_id,
        skip=skip,
        limit=limit,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient,
    contact_id: None | Unset | UUID = UNSET,
    skip: int | Unset = 0,
    limit: int | Unset = 100,
) -> HTTPValidationError | InteractionsPublic | None:
    """List Interactions

     List interactions. Pass ``contact_id`` to filter by attendee.

    Args:
        contact_id (None | Unset | UUID):
        skip (int | Unset):  Default: 0.
        limit (int | Unset):  Default: 100.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | InteractionsPublic
    """

    return sync_detailed(
        client=client,
        contact_id=contact_id,
        skip=skip,
        limit=limit,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient,
    contact_id: None | Unset | UUID = UNSET,
    skip: int | Unset = 0,
    limit: int | Unset = 100,
) -> Response[HTTPValidationError | InteractionsPublic]:
    """List Interactions

     List interactions. Pass ``contact_id`` to filter by attendee.

    Args:
        contact_id (None | Unset | UUID):
        skip (int | Unset):  Default: 0.
        limit (int | Unset):  Default: 100.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | InteractionsPublic]
    """

    kwargs = _get_kwargs(
        contact_id=contact_id,
        skip=skip,
        limit=limit,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient,
    contact_id: None | Unset | UUID = UNSET,
    skip: int | Unset = 0,
    limit: int | Unset = 100,
) -> HTTPValidationError | InteractionsPublic | None:
    """List Interactions

     List interactions. Pass ``contact_id`` to filter by attendee.

    Args:
        contact_id (None | Unset | UUID):
        skip (int | Unset):  Default: 0.
        limit (int | Unset):  Default: 100.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | InteractionsPublic
    """

    return (
        await asyncio_detailed(
            client=client,
            contact_id=contact_id,
            skip=skip,
            limit=limit,
        )
    ).parsed
