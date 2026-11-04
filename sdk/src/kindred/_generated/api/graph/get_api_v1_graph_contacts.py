from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.http_validation_error import HTTPValidationError
from ...types import UNSET, Unset
from typing import cast
from uuid import UUID


def _get_kwargs(
    *,
    depth: int | Unset = 2,
    root_contact_id: None | Unset | UUID = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["depth"] = depth

    json_root_contact_id: None | str | Unset
    if isinstance(root_contact_id, Unset):
        json_root_contact_id = UNSET
    elif isinstance(root_contact_id, UUID):
        json_root_contact_id = str(root_contact_id)
    else:
        json_root_contact_id = root_contact_id
    params["root_contact_id"] = json_root_contact_id

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/v1/graph/contacts",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Any | HTTPValidationError | None:
    if response.status_code == 200:
        response_200 = response.json()
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
) -> Response[Any | HTTPValidationError]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient,
    depth: int | Unset = 2,
    root_contact_id: None | Unset | UUID = UNSET,
) -> Response[Any | HTTPValidationError]:
    """Get Contacts Graph

     Return contacts + relationships as a graph (nodes + edges).

    Args:
        depth (int | Unset): Hops from seed contacts (1-3) Default: 2.
        root_contact_id (None | Unset | UUID): Optional root contact to focus on

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | HTTPValidationError]
    """

    kwargs = _get_kwargs(
        depth=depth,
        root_contact_id=root_contact_id,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient,
    depth: int | Unset = 2,
    root_contact_id: None | Unset | UUID = UNSET,
) -> Any | HTTPValidationError | None:
    """Get Contacts Graph

     Return contacts + relationships as a graph (nodes + edges).

    Args:
        depth (int | Unset): Hops from seed contacts (1-3) Default: 2.
        root_contact_id (None | Unset | UUID): Optional root contact to focus on

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | HTTPValidationError
    """

    return sync_detailed(
        client=client,
        depth=depth,
        root_contact_id=root_contact_id,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient,
    depth: int | Unset = 2,
    root_contact_id: None | Unset | UUID = UNSET,
) -> Response[Any | HTTPValidationError]:
    """Get Contacts Graph

     Return contacts + relationships as a graph (nodes + edges).

    Args:
        depth (int | Unset): Hops from seed contacts (1-3) Default: 2.
        root_contact_id (None | Unset | UUID): Optional root contact to focus on

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | HTTPValidationError]
    """

    kwargs = _get_kwargs(
        depth=depth,
        root_contact_id=root_contact_id,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient,
    depth: int | Unset = 2,
    root_contact_id: None | Unset | UUID = UNSET,
) -> Any | HTTPValidationError | None:
    """Get Contacts Graph

     Return contacts + relationships as a graph (nodes + edges).

    Args:
        depth (int | Unset): Hops from seed contacts (1-3) Default: 2.
        root_contact_id (None | Unset | UUID): Optional root contact to focus on

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | HTTPValidationError
    """

    return (
        await asyncio_detailed(
            client=client,
            depth=depth,
            root_contact_id=root_contact_id,
        )
    ).parsed
