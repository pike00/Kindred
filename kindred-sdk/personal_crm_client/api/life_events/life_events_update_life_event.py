from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.http_validation_error import HTTPValidationError
from ...models.life_event_public import LifeEventPublic
from ...models.life_event_update import LifeEventUpdate
from typing import cast
from uuid import UUID



def _get_kwargs(
    event_id: UUID,
    *,
    body: LifeEventUpdate,

) -> dict[str, Any]:
    headers: dict[str, Any] = {}


    

    

    _kwargs: dict[str, Any] = {
        "method": "patch",
        "url": "/api/v1/life-events/{event_id}".format(event_id=quote(str(event_id), safe=""),),
    }

    _kwargs["json"] = body.to_dict()


    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs



def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> HTTPValidationError | LifeEventPublic | None:
    if response.status_code == 200:
        response_200 = LifeEventPublic.from_dict(response.json())



        return response_200

    if response.status_code == 422:
        response_422 = HTTPValidationError.from_dict(response.json())



        return response_422

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Response[HTTPValidationError | LifeEventPublic]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    event_id: UUID,
    *,
    client: AuthenticatedClient,
    body: LifeEventUpdate,

) -> Response[HTTPValidationError | LifeEventPublic]:
    """ Update Life Event

     Update a life event.

    Args:
        event_id (UUID):
        body (LifeEventUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | LifeEventPublic]
     """


    kwargs = _get_kwargs(
        event_id=event_id,
body=body,

    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)

def sync(
    event_id: UUID,
    *,
    client: AuthenticatedClient,
    body: LifeEventUpdate,

) -> HTTPValidationError | LifeEventPublic | None:
    """ Update Life Event

     Update a life event.

    Args:
        event_id (UUID):
        body (LifeEventUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | LifeEventPublic
     """


    return sync_detailed(
        event_id=event_id,
client=client,
body=body,

    ).parsed

async def asyncio_detailed(
    event_id: UUID,
    *,
    client: AuthenticatedClient,
    body: LifeEventUpdate,

) -> Response[HTTPValidationError | LifeEventPublic]:
    """ Update Life Event

     Update a life event.

    Args:
        event_id (UUID):
        body (LifeEventUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | LifeEventPublic]
     """


    kwargs = _get_kwargs(
        event_id=event_id,
body=body,

    )

    response = await client.get_async_httpx_client().request(
        **kwargs
    )

    return _build_response(client=client, response=response)

async def asyncio(
    event_id: UUID,
    *,
    client: AuthenticatedClient,
    body: LifeEventUpdate,

) -> HTTPValidationError | LifeEventPublic | None:
    """ Update Life Event

     Update a life event.

    Args:
        event_id (UUID):
        body (LifeEventUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | LifeEventPublic
     """


    return (await asyncio_detailed(
        event_id=event_id,
client=client,
body=body,

    )).parsed
