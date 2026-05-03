from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.debt_public import DebtPublic
from ...models.debt_update import DebtUpdate
from ...models.http_validation_error import HTTPValidationError
from typing import cast
from uuid import UUID



def _get_kwargs(
    debt_id: UUID,
    *,
    body: DebtUpdate,

) -> dict[str, Any]:
    headers: dict[str, Any] = {}


    

    

    _kwargs: dict[str, Any] = {
        "method": "patch",
        "url": "/api/v1/debts/{debt_id}".format(debt_id=quote(str(debt_id), safe=""),),
    }

    _kwargs["json"] = body.to_dict()


    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs



def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> DebtPublic | HTTPValidationError | None:
    if response.status_code == 200:
        response_200 = DebtPublic.from_dict(response.json())



        return response_200

    if response.status_code == 422:
        response_422 = HTTPValidationError.from_dict(response.json())



        return response_422

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Response[DebtPublic | HTTPValidationError]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    debt_id: UUID,
    *,
    client: AuthenticatedClient,
    body: DebtUpdate,

) -> Response[DebtPublic | HTTPValidationError]:
    """ Update Debt

     Update a debt.

    Args:
        debt_id (UUID):
        body (DebtUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[DebtPublic | HTTPValidationError]
     """


    kwargs = _get_kwargs(
        debt_id=debt_id,
body=body,

    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)

def sync(
    debt_id: UUID,
    *,
    client: AuthenticatedClient,
    body: DebtUpdate,

) -> DebtPublic | HTTPValidationError | None:
    """ Update Debt

     Update a debt.

    Args:
        debt_id (UUID):
        body (DebtUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        DebtPublic | HTTPValidationError
     """


    return sync_detailed(
        debt_id=debt_id,
client=client,
body=body,

    ).parsed

async def asyncio_detailed(
    debt_id: UUID,
    *,
    client: AuthenticatedClient,
    body: DebtUpdate,

) -> Response[DebtPublic | HTTPValidationError]:
    """ Update Debt

     Update a debt.

    Args:
        debt_id (UUID):
        body (DebtUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[DebtPublic | HTTPValidationError]
     """


    kwargs = _get_kwargs(
        debt_id=debt_id,
body=body,

    )

    response = await client.get_async_httpx_client().request(
        **kwargs
    )

    return _build_response(client=client, response=response)

async def asyncio(
    debt_id: UUID,
    *,
    client: AuthenticatedClient,
    body: DebtUpdate,

) -> DebtPublic | HTTPValidationError | None:
    """ Update Debt

     Update a debt.

    Args:
        debt_id (UUID):
        body (DebtUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        DebtPublic | HTTPValidationError
     """


    return (await asyncio_detailed(
        debt_id=debt_id,
client=client,
body=body,

    )).parsed
