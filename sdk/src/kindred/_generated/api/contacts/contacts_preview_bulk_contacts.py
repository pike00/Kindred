from http import HTTPStatus
from typing import Any
from uuid import UUID

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.contacts_public import ContactsPublic
from ...models.http_validation_error import HTTPValidationError
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    select_all_filtered: bool | Unset = False,
    search: None | str | Unset = UNSET,
    tag_id: None | Unset | UUID = UNSET,
    is_favorite: bool | None | Unset = UNSET,
    is_archived: bool | None | Unset = UNSET,
    stage: None | str | Unset = UNSET,
    limit: int | Unset = 500,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["select_all_filtered"] = select_all_filtered

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

    json_is_favorite: bool | None | Unset
    if isinstance(is_favorite, Unset):
        json_is_favorite = UNSET
    else:
        json_is_favorite = is_favorite
    params["is_favorite"] = json_is_favorite

    json_is_archived: bool | None | Unset
    if isinstance(is_archived, Unset):
        json_is_archived = UNSET
    else:
        json_is_archived = is_archived
    params["is_archived"] = json_is_archived

    json_stage: None | str | Unset
    if isinstance(stage, Unset):
        json_stage = UNSET
    else:
        json_stage = stage
    params["stage"] = json_stage

    params["limit"] = limit

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/v1/contacts/bulk/preview",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> ContactsPublic | HTTPValidationError | None:
    if response.status_code == 200:
        response_200 = ContactsPublic.from_dict(response.json())

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
) -> Response[ContactsPublic | HTTPValidationError]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient,
    select_all_filtered: bool | Unset = False,
    search: None | str | Unset = UNSET,
    tag_id: None | Unset | UUID = UNSET,
    is_favorite: bool | None | Unset = UNSET,
    is_archived: bool | None | Unset = UNSET,
    stage: None | str | Unset = UNSET,
    limit: int | Unset = 500,
) -> Response[ContactsPublic | HTTPValidationError]:
    """Preview Bulk Contacts

     Preview contacts that would be affected by a bulk operation.

    Args:
        select_all_filtered (bool | Unset):  Default: False.
        search (None | str | Unset):
        tag_id (None | Unset | UUID):
        is_favorite (bool | None | Unset):
        is_archived (bool | None | Unset):
        stage (None | str | Unset):
        limit (int | Unset):  Default: 500.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[ContactsPublic | HTTPValidationError]
    """

    kwargs = _get_kwargs(
        select_all_filtered=select_all_filtered,
        search=search,
        tag_id=tag_id,
        is_favorite=is_favorite,
        is_archived=is_archived,
        stage=stage,
        limit=limit,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient,
    select_all_filtered: bool | Unset = False,
    search: None | str | Unset = UNSET,
    tag_id: None | Unset | UUID = UNSET,
    is_favorite: bool | None | Unset = UNSET,
    is_archived: bool | None | Unset = UNSET,
    stage: None | str | Unset = UNSET,
    limit: int | Unset = 500,
) -> ContactsPublic | HTTPValidationError | None:
    """Preview Bulk Contacts

     Preview contacts that would be affected by a bulk operation.

    Args:
        select_all_filtered (bool | Unset):  Default: False.
        search (None | str | Unset):
        tag_id (None | Unset | UUID):
        is_favorite (bool | None | Unset):
        is_archived (bool | None | Unset):
        stage (None | str | Unset):
        limit (int | Unset):  Default: 500.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ContactsPublic | HTTPValidationError
    """

    return sync_detailed(
        client=client,
        select_all_filtered=select_all_filtered,
        search=search,
        tag_id=tag_id,
        is_favorite=is_favorite,
        is_archived=is_archived,
        stage=stage,
        limit=limit,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient,
    select_all_filtered: bool | Unset = False,
    search: None | str | Unset = UNSET,
    tag_id: None | Unset | UUID = UNSET,
    is_favorite: bool | None | Unset = UNSET,
    is_archived: bool | None | Unset = UNSET,
    stage: None | str | Unset = UNSET,
    limit: int | Unset = 500,
) -> Response[ContactsPublic | HTTPValidationError]:
    """Preview Bulk Contacts

     Preview contacts that would be affected by a bulk operation.

    Args:
        select_all_filtered (bool | Unset):  Default: False.
        search (None | str | Unset):
        tag_id (None | Unset | UUID):
        is_favorite (bool | None | Unset):
        is_archived (bool | None | Unset):
        stage (None | str | Unset):
        limit (int | Unset):  Default: 500.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[ContactsPublic | HTTPValidationError]
    """

    kwargs = _get_kwargs(
        select_all_filtered=select_all_filtered,
        search=search,
        tag_id=tag_id,
        is_favorite=is_favorite,
        is_archived=is_archived,
        stage=stage,
        limit=limit,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient,
    select_all_filtered: bool | Unset = False,
    search: None | str | Unset = UNSET,
    tag_id: None | Unset | UUID = UNSET,
    is_favorite: bool | None | Unset = UNSET,
    is_archived: bool | None | Unset = UNSET,
    stage: None | str | Unset = UNSET,
    limit: int | Unset = 500,
) -> ContactsPublic | HTTPValidationError | None:
    """Preview Bulk Contacts

     Preview contacts that would be affected by a bulk operation.

    Args:
        select_all_filtered (bool | Unset):  Default: False.
        search (None | str | Unset):
        tag_id (None | Unset | UUID):
        is_favorite (bool | None | Unset):
        is_archived (bool | None | Unset):
        stage (None | str | Unset):
        limit (int | Unset):  Default: 500.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ContactsPublic | HTTPValidationError
    """

    return (
        await asyncio_detailed(
            client=client,
            select_all_filtered=select_all_filtered,
            search=search,
            tag_id=tag_id,
            is_favorite=is_favorite,
            is_archived=is_archived,
            stage=stage,
            limit=limit,
        )
    ).parsed
