from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.activity_logs_public import ActivityLogsPublic
from ...models.http_validation_error import HTTPValidationError
from ...types import UNSET, Unset
from typing import cast
from uuid import UUID



def _get_kwargs(
    *,
    entity_type: None | str | Unset = UNSET,
    entity_id: None | Unset | UUID = UNSET,
    tag_id: None | Unset | UUID = UNSET,
    limit: int | Unset = 50,
    offset: int | Unset = 0,

) -> dict[str, Any]:
    

    

    params: dict[str, Any] = {}

    json_entity_type: None | str | Unset
    if isinstance(entity_type, Unset):
        json_entity_type = UNSET
    else:
        json_entity_type = entity_type
    params["entity_type"] = json_entity_type

    json_entity_id: None | str | Unset
    if isinstance(entity_id, Unset):
        json_entity_id = UNSET
    elif isinstance(entity_id, UUID):
        json_entity_id = str(entity_id)
    else:
        json_entity_id = entity_id
    params["entity_id"] = json_entity_id

    json_tag_id: None | str | Unset
    if isinstance(tag_id, Unset):
        json_tag_id = UNSET
    elif isinstance(tag_id, UUID):
        json_tag_id = str(tag_id)
    else:
        json_tag_id = tag_id
    params["tag_id"] = json_tag_id

    params["limit"] = limit

    params["offset"] = offset


    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}


    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/v1/activity-logs/",
        "params": params,
    }


    return _kwargs



def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> ActivityLogsPublic | HTTPValidationError | None:
    if response.status_code == 200:
        response_200 = ActivityLogsPublic.from_dict(response.json())



        return response_200

    if response.status_code == 422:
        response_422 = HTTPValidationError.from_dict(response.json())



        return response_422

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Response[ActivityLogsPublic | HTTPValidationError]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient,
    entity_type: None | str | Unset = UNSET,
    entity_id: None | Unset | UUID = UNSET,
    tag_id: None | Unset | UUID = UNSET,
    limit: int | Unset = 50,
    offset: int | Unset = 0,

) -> Response[ActivityLogsPublic | HTTPValidationError]:
    """ List Activity Logs

     Return activity log entries for entities visible to the current user.

    Owned logs (any entity type) are always included.  Contact-entity logs are
    also included when the contact is visible via a TagShare grant.

    Args:
        entity_type (None | str | Unset):
        entity_id (None | Unset | UUID):
        tag_id (None | Unset | UUID):
        limit (int | Unset):  Default: 50.
        offset (int | Unset):  Default: 0.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[ActivityLogsPublic | HTTPValidationError]
     """


    kwargs = _get_kwargs(
        entity_type=entity_type,
entity_id=entity_id,
tag_id=tag_id,
limit=limit,
offset=offset,

    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)

def sync(
    *,
    client: AuthenticatedClient,
    entity_type: None | str | Unset = UNSET,
    entity_id: None | Unset | UUID = UNSET,
    tag_id: None | Unset | UUID = UNSET,
    limit: int | Unset = 50,
    offset: int | Unset = 0,

) -> ActivityLogsPublic | HTTPValidationError | None:
    """ List Activity Logs

     Return activity log entries for entities visible to the current user.

    Owned logs (any entity type) are always included.  Contact-entity logs are
    also included when the contact is visible via a TagShare grant.

    Args:
        entity_type (None | str | Unset):
        entity_id (None | Unset | UUID):
        tag_id (None | Unset | UUID):
        limit (int | Unset):  Default: 50.
        offset (int | Unset):  Default: 0.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ActivityLogsPublic | HTTPValidationError
     """


    return sync_detailed(
        client=client,
entity_type=entity_type,
entity_id=entity_id,
tag_id=tag_id,
limit=limit,
offset=offset,

    ).parsed

async def asyncio_detailed(
    *,
    client: AuthenticatedClient,
    entity_type: None | str | Unset = UNSET,
    entity_id: None | Unset | UUID = UNSET,
    tag_id: None | Unset | UUID = UNSET,
    limit: int | Unset = 50,
    offset: int | Unset = 0,

) -> Response[ActivityLogsPublic | HTTPValidationError]:
    """ List Activity Logs

     Return activity log entries for entities visible to the current user.

    Owned logs (any entity type) are always included.  Contact-entity logs are
    also included when the contact is visible via a TagShare grant.

    Args:
        entity_type (None | str | Unset):
        entity_id (None | Unset | UUID):
        tag_id (None | Unset | UUID):
        limit (int | Unset):  Default: 50.
        offset (int | Unset):  Default: 0.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[ActivityLogsPublic | HTTPValidationError]
     """


    kwargs = _get_kwargs(
        entity_type=entity_type,
entity_id=entity_id,
tag_id=tag_id,
limit=limit,
offset=offset,

    )

    response = await client.get_async_httpx_client().request(
        **kwargs
    )

    return _build_response(client=client, response=response)

async def asyncio(
    *,
    client: AuthenticatedClient,
    entity_type: None | str | Unset = UNSET,
    entity_id: None | Unset | UUID = UNSET,
    tag_id: None | Unset | UUID = UNSET,
    limit: int | Unset = 50,
    offset: int | Unset = 0,

) -> ActivityLogsPublic | HTTPValidationError | None:
    """ List Activity Logs

     Return activity log entries for entities visible to the current user.

    Owned logs (any entity type) are always included.  Contact-entity logs are
    also included when the contact is visible via a TagShare grant.

    Args:
        entity_type (None | str | Unset):
        entity_id (None | Unset | UUID):
        tag_id (None | Unset | UUID):
        limit (int | Unset):  Default: 50.
        offset (int | Unset):  Default: 0.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ActivityLogsPublic | HTTPValidationError
     """


    return (await asyncio_detailed(
        client=client,
entity_type=entity_type,
entity_id=entity_id,
tag_id=tag_id,
limit=limit,
offset=offset,

    )).parsed
