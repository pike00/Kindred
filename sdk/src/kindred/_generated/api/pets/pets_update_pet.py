from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.http_validation_error import HTTPValidationError
from ...models.pet_public import PetPublic
from ...models.pet_update import PetUpdate
from typing import cast
from uuid import UUID


def _get_kwargs(
    pet_id: UUID,
    *,
    body: PetUpdate,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "patch",
        "url": "/api/v1/pets/{pet_id}".format(
            pet_id=quote(str(pet_id), safe=""),
        ),
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> HTTPValidationError | PetPublic | None:
    if response.status_code == 200:
        response_200 = PetPublic.from_dict(response.json())

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
) -> Response[HTTPValidationError | PetPublic]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    pet_id: UUID,
    *,
    client: AuthenticatedClient,
    body: PetUpdate,
) -> Response[HTTPValidationError | PetPublic]:
    """Update Pet

     Update a pet.

    Args:
        pet_id (UUID):
        body (PetUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | PetPublic]
    """

    kwargs = _get_kwargs(
        pet_id=pet_id,
        body=body,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    pet_id: UUID,
    *,
    client: AuthenticatedClient,
    body: PetUpdate,
) -> HTTPValidationError | PetPublic | None:
    """Update Pet

     Update a pet.

    Args:
        pet_id (UUID):
        body (PetUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | PetPublic
    """

    return sync_detailed(
        pet_id=pet_id,
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    pet_id: UUID,
    *,
    client: AuthenticatedClient,
    body: PetUpdate,
) -> Response[HTTPValidationError | PetPublic]:
    """Update Pet

     Update a pet.

    Args:
        pet_id (UUID):
        body (PetUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | PetPublic]
    """

    kwargs = _get_kwargs(
        pet_id=pet_id,
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    pet_id: UUID,
    *,
    client: AuthenticatedClient,
    body: PetUpdate,
) -> HTTPValidationError | PetPublic | None:
    """Update Pet

     Update a pet.

    Args:
        pet_id (UUID):
        body (PetUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | PetPublic
    """

    return (
        await asyncio_detailed(
            pet_id=pet_id,
            client=client,
            body=body,
        )
    ).parsed
