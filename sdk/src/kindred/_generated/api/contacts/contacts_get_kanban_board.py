from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.contacts_get_kanban_board_response_contacts_get_kanban_board import (
    ContactsGetKanbanBoardResponseContactsGetKanbanBoard,
)
from ...models.http_validation_error import HTTPValidationError
from ...types import UNSET, Unset
from typing import cast
from uuid import UUID


def _get_kwargs(
    *,
    search: None | str | Unset = UNSET,
    tag_id: None | Unset | UUID = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    json_search: None | str | Unset
    if isinstance(search, Unset):
        json_search = UNSET
    else:
        json_search = search
    params["search"] = json_search

    json_tag_id: None | str | Unset
    if isinstance(tag_id, Unset):
        json_tag_id = UNSET
    elif isinstance(tag_id, UUID):
        json_tag_id = str(tag_id)
    else:
        json_tag_id = tag_id
    params["tag_id"] = json_tag_id

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/v1/contacts/kanban",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> ContactsGetKanbanBoardResponseContactsGetKanbanBoard | HTTPValidationError | None:
    if response.status_code == 200:
        response_200 = ContactsGetKanbanBoardResponseContactsGetKanbanBoard.from_dict(response.json())

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
) -> Response[ContactsGetKanbanBoardResponseContactsGetKanbanBoard | HTTPValidationError]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient,
    search: None | str | Unset = UNSET,
    tag_id: None | Unset | UUID = UNSET,
) -> Response[ContactsGetKanbanBoardResponseContactsGetKanbanBoard | HTTPValidationError]:
    """Get Kanban Board

     Return contacts grouped by stage for kanban board.

    Args:
        search (None | str | Unset):
        tag_id (None | Unset | UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[ContactsGetKanbanBoardResponseContactsGetKanbanBoard | HTTPValidationError]
    """

    kwargs = _get_kwargs(
        search=search,
        tag_id=tag_id,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient,
    search: None | str | Unset = UNSET,
    tag_id: None | Unset | UUID = UNSET,
) -> ContactsGetKanbanBoardResponseContactsGetKanbanBoard | HTTPValidationError | None:
    """Get Kanban Board

     Return contacts grouped by stage for kanban board.

    Args:
        search (None | str | Unset):
        tag_id (None | Unset | UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ContactsGetKanbanBoardResponseContactsGetKanbanBoard | HTTPValidationError
    """

    return sync_detailed(
        client=client,
        search=search,
        tag_id=tag_id,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient,
    search: None | str | Unset = UNSET,
    tag_id: None | Unset | UUID = UNSET,
) -> Response[ContactsGetKanbanBoardResponseContactsGetKanbanBoard | HTTPValidationError]:
    """Get Kanban Board

     Return contacts grouped by stage for kanban board.

    Args:
        search (None | str | Unset):
        tag_id (None | Unset | UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[ContactsGetKanbanBoardResponseContactsGetKanbanBoard | HTTPValidationError]
    """

    kwargs = _get_kwargs(
        search=search,
        tag_id=tag_id,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient,
    search: None | str | Unset = UNSET,
    tag_id: None | Unset | UUID = UNSET,
) -> ContactsGetKanbanBoardResponseContactsGetKanbanBoard | HTTPValidationError | None:
    """Get Kanban Board

     Return contacts grouped by stage for kanban board.

    Args:
        search (None | str | Unset):
        tag_id (None | Unset | UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ContactsGetKanbanBoardResponseContactsGetKanbanBoard | HTTPValidationError
    """

    return (
        await asyncio_detailed(
            client=client,
            search=search,
            tag_id=tag_id,
        )
    ).parsed
