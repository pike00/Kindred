from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.contacts_public import ContactsPublic
from ...models.http_validation_error import HTTPValidationError
from ...types import UNSET, Unset
from typing import cast
from uuid import UUID


def _get_kwargs(
    *,
    skip: int | Unset = 0,
    limit: int | Unset = 100,
    search: None | str | Unset = UNSET,
    tag_id: None | Unset | UUID = UNSET,
    is_favorite: bool | None | Unset = UNSET,
    is_archived: bool | None | Unset = UNSET,
    stage: None | str | Unset = UNSET,
    include_deleted: bool | Unset = False,
    only_deleted: bool | Unset = False,
    ids: list[UUID] | None | Unset = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["skip"] = skip

    params["limit"] = limit

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

    params["include_deleted"] = include_deleted

    params["only_deleted"] = only_deleted

    json_ids: list[str] | None | Unset
    if isinstance(ids, Unset):
        json_ids = UNSET
    elif isinstance(ids, list):
        json_ids = []
        for ids_type_0_item_data in ids:
            ids_type_0_item = str(ids_type_0_item_data)
            json_ids.append(ids_type_0_item)

    else:
        json_ids = ids
    params["ids"] = json_ids

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/v1/contacts/",
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
    skip: int | Unset = 0,
    limit: int | Unset = 100,
    search: None | str | Unset = UNSET,
    tag_id: None | Unset | UUID = UNSET,
    is_favorite: bool | None | Unset = UNSET,
    is_archived: bool | None | Unset = UNSET,
    stage: None | str | Unset = UNSET,
    include_deleted: bool | Unset = False,
    only_deleted: bool | Unset = False,
    ids: list[UUID] | None | Unset = UNSET,
) -> Response[ContactsPublic | HTTPValidationError]:
    """List Contacts

     List contacts with filtering.

    Pass `ids=<uuid>&ids=<uuid>` to fetch a specific batch of contacts (useful for
    hydrating references from other resources). When `ids` is provided, the default
    `is_archived=false` filter is lifted so callers can resolve archived rows too.

    Soft-deleted contacts (``deleted_at`` set) are hidden by default. Pass
    ``include_deleted=true`` to surface them alongside live rows, or
    ``only_deleted=true`` to fetch the trash view exclusively.

    Args:
        skip (int | Unset):  Default: 0.
        limit (int | Unset):  Default: 100.
        search (None | str | Unset):
        tag_id (None | Unset | UUID):
        is_favorite (bool | None | Unset):
        is_archived (bool | None | Unset):
        stage (None | str | Unset):
        include_deleted (bool | Unset):  Default: False.
        only_deleted (bool | Unset):  Default: False.
        ids (list[UUID] | None | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[ContactsPublic | HTTPValidationError]
    """

    kwargs = _get_kwargs(
        skip=skip,
        limit=limit,
        search=search,
        tag_id=tag_id,
        is_favorite=is_favorite,
        is_archived=is_archived,
        stage=stage,
        include_deleted=include_deleted,
        only_deleted=only_deleted,
        ids=ids,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient,
    skip: int | Unset = 0,
    limit: int | Unset = 100,
    search: None | str | Unset = UNSET,
    tag_id: None | Unset | UUID = UNSET,
    is_favorite: bool | None | Unset = UNSET,
    is_archived: bool | None | Unset = UNSET,
    stage: None | str | Unset = UNSET,
    include_deleted: bool | Unset = False,
    only_deleted: bool | Unset = False,
    ids: list[UUID] | None | Unset = UNSET,
) -> ContactsPublic | HTTPValidationError | None:
    """List Contacts

     List contacts with filtering.

    Pass `ids=<uuid>&ids=<uuid>` to fetch a specific batch of contacts (useful for
    hydrating references from other resources). When `ids` is provided, the default
    `is_archived=false` filter is lifted so callers can resolve archived rows too.

    Soft-deleted contacts (``deleted_at`` set) are hidden by default. Pass
    ``include_deleted=true`` to surface them alongside live rows, or
    ``only_deleted=true`` to fetch the trash view exclusively.

    Args:
        skip (int | Unset):  Default: 0.
        limit (int | Unset):  Default: 100.
        search (None | str | Unset):
        tag_id (None | Unset | UUID):
        is_favorite (bool | None | Unset):
        is_archived (bool | None | Unset):
        stage (None | str | Unset):
        include_deleted (bool | Unset):  Default: False.
        only_deleted (bool | Unset):  Default: False.
        ids (list[UUID] | None | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ContactsPublic | HTTPValidationError
    """

    return sync_detailed(
        client=client,
        skip=skip,
        limit=limit,
        search=search,
        tag_id=tag_id,
        is_favorite=is_favorite,
        is_archived=is_archived,
        stage=stage,
        include_deleted=include_deleted,
        only_deleted=only_deleted,
        ids=ids,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient,
    skip: int | Unset = 0,
    limit: int | Unset = 100,
    search: None | str | Unset = UNSET,
    tag_id: None | Unset | UUID = UNSET,
    is_favorite: bool | None | Unset = UNSET,
    is_archived: bool | None | Unset = UNSET,
    stage: None | str | Unset = UNSET,
    include_deleted: bool | Unset = False,
    only_deleted: bool | Unset = False,
    ids: list[UUID] | None | Unset = UNSET,
) -> Response[ContactsPublic | HTTPValidationError]:
    """List Contacts

     List contacts with filtering.

    Pass `ids=<uuid>&ids=<uuid>` to fetch a specific batch of contacts (useful for
    hydrating references from other resources). When `ids` is provided, the default
    `is_archived=false` filter is lifted so callers can resolve archived rows too.

    Soft-deleted contacts (``deleted_at`` set) are hidden by default. Pass
    ``include_deleted=true`` to surface them alongside live rows, or
    ``only_deleted=true`` to fetch the trash view exclusively.

    Args:
        skip (int | Unset):  Default: 0.
        limit (int | Unset):  Default: 100.
        search (None | str | Unset):
        tag_id (None | Unset | UUID):
        is_favorite (bool | None | Unset):
        is_archived (bool | None | Unset):
        stage (None | str | Unset):
        include_deleted (bool | Unset):  Default: False.
        only_deleted (bool | Unset):  Default: False.
        ids (list[UUID] | None | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[ContactsPublic | HTTPValidationError]
    """

    kwargs = _get_kwargs(
        skip=skip,
        limit=limit,
        search=search,
        tag_id=tag_id,
        is_favorite=is_favorite,
        is_archived=is_archived,
        stage=stage,
        include_deleted=include_deleted,
        only_deleted=only_deleted,
        ids=ids,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient,
    skip: int | Unset = 0,
    limit: int | Unset = 100,
    search: None | str | Unset = UNSET,
    tag_id: None | Unset | UUID = UNSET,
    is_favorite: bool | None | Unset = UNSET,
    is_archived: bool | None | Unset = UNSET,
    stage: None | str | Unset = UNSET,
    include_deleted: bool | Unset = False,
    only_deleted: bool | Unset = False,
    ids: list[UUID] | None | Unset = UNSET,
) -> ContactsPublic | HTTPValidationError | None:
    """List Contacts

     List contacts with filtering.

    Pass `ids=<uuid>&ids=<uuid>` to fetch a specific batch of contacts (useful for
    hydrating references from other resources). When `ids` is provided, the default
    `is_archived=false` filter is lifted so callers can resolve archived rows too.

    Soft-deleted contacts (``deleted_at`` set) are hidden by default. Pass
    ``include_deleted=true`` to surface them alongside live rows, or
    ``only_deleted=true`` to fetch the trash view exclusively.

    Args:
        skip (int | Unset):  Default: 0.
        limit (int | Unset):  Default: 100.
        search (None | str | Unset):
        tag_id (None | Unset | UUID):
        is_favorite (bool | None | Unset):
        is_archived (bool | None | Unset):
        stage (None | str | Unset):
        include_deleted (bool | Unset):  Default: False.
        only_deleted (bool | Unset):  Default: False.
        ids (list[UUID] | None | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ContactsPublic | HTTPValidationError
    """

    return (
        await asyncio_detailed(
            client=client,
            skip=skip,
            limit=limit,
            search=search,
            tag_id=tag_id,
            is_favorite=is_favorite,
            is_archived=is_archived,
            stage=stage,
            include_deleted=include_deleted,
            only_deleted=only_deleted,
            ids=ids,
        )
    ).parsed
