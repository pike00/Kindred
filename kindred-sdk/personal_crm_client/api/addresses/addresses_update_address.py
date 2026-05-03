from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.address_public import AddressPublic
from ...models.address_update import AddressUpdate
from ...models.http_validation_error import HTTPValidationError
from typing import cast
from uuid import UUID



def _get_kwargs(
    address_id: UUID,
    *,
    body: AddressUpdate,

) -> dict[str, Any]:
    headers: dict[str, Any] = {}


    

    

    _kwargs: dict[str, Any] = {
        "method": "patch",
        "url": "/api/v1/addresses/{address_id}".format(address_id=quote(str(address_id), safe=""),),
    }

    _kwargs["json"] = body.to_dict()


    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs



def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> AddressPublic | HTTPValidationError | None:
    if response.status_code == 200:
        response_200 = AddressPublic.from_dict(response.json())



        return response_200

    if response.status_code == 422:
        response_422 = HTTPValidationError.from_dict(response.json())



        return response_422

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Response[AddressPublic | HTTPValidationError]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    address_id: UUID,
    *,
    client: AuthenticatedClient,
    body: AddressUpdate,

) -> Response[AddressPublic | HTTPValidationError]:
    """ Update Address

     Update an address.

    Args:
        address_id (UUID):
        body (AddressUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[AddressPublic | HTTPValidationError]
     """


    kwargs = _get_kwargs(
        address_id=address_id,
body=body,

    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)

def sync(
    address_id: UUID,
    *,
    client: AuthenticatedClient,
    body: AddressUpdate,

) -> AddressPublic | HTTPValidationError | None:
    """ Update Address

     Update an address.

    Args:
        address_id (UUID):
        body (AddressUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        AddressPublic | HTTPValidationError
     """


    return sync_detailed(
        address_id=address_id,
client=client,
body=body,

    ).parsed

async def asyncio_detailed(
    address_id: UUID,
    *,
    client: AuthenticatedClient,
    body: AddressUpdate,

) -> Response[AddressPublic | HTTPValidationError]:
    """ Update Address

     Update an address.

    Args:
        address_id (UUID):
        body (AddressUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[AddressPublic | HTTPValidationError]
     """


    kwargs = _get_kwargs(
        address_id=address_id,
body=body,

    )

    response = await client.get_async_httpx_client().request(
        **kwargs
    )

    return _build_response(client=client, response=response)

async def asyncio(
    address_id: UUID,
    *,
    client: AuthenticatedClient,
    body: AddressUpdate,

) -> AddressPublic | HTTPValidationError | None:
    """ Update Address

     Update an address.

    Args:
        address_id (UUID):
        body (AddressUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        AddressPublic | HTTPValidationError
     """


    return (await asyncio_detailed(
        address_id=address_id,
client=client,
body=body,

    )).parsed
