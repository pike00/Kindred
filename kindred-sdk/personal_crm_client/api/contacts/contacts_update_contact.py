from http import HTTPStatus
from typing import Any
from urllib.parse import quote
from uuid import UUID

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.contact_public import ContactPublic
from ...models.contact_update import ContactUpdate
from ...models.http_validation_error import HTTPValidationError
from ...types import Response


def _get_kwargs(
    contact_id: UUID,
    *,
    body: ContactUpdate,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "patch",
        "url": "/api/v1/contacts/{contact_id}".format(
            contact_id=quote(str(contact_id), safe=""),
        ),
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> ContactPublic | HTTPValidationError | None:
    if response.status_code == 200:
        response_200 = ContactPublic.from_dict(response.json())

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
) -> Response[ContactPublic | HTTPValidationError]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    contact_id: UUID,
    *,
    client: AuthenticatedClient,
    body: ContactUpdate,
) -> Response[ContactPublic | HTTPValidationError]:
    """Update Contact

     Update a contact.

    Args:
        contact_id (UUID):
        body (ContactUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[ContactPublic | HTTPValidationError]
    """

    kwargs = _get_kwargs(
        contact_id=contact_id,
        body=body,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    contact_id: UUID,
    *,
    client: AuthenticatedClient,
    body: ContactUpdate,
) -> ContactPublic | HTTPValidationError | None:
    """Update Contact

     Update a contact.

    Args:
        contact_id (UUID):
        body (ContactUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ContactPublic | HTTPValidationError
    """

    return sync_detailed(
        contact_id=contact_id,
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    contact_id: UUID,
    *,
    client: AuthenticatedClient,
    body: ContactUpdate,
) -> Response[ContactPublic | HTTPValidationError]:
    """Update Contact

     Update a contact.

    Args:
        contact_id (UUID):
        body (ContactUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[ContactPublic | HTTPValidationError]
    """

    kwargs = _get_kwargs(
        contact_id=contact_id,
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    contact_id: UUID,
    *,
    client: AuthenticatedClient,
    body: ContactUpdate,
) -> ContactPublic | HTTPValidationError | None:
    """Update Contact

     Update a contact.

    Args:
        contact_id (UUID):
        body (ContactUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ContactPublic | HTTPValidationError
    """

    return (
        await asyncio_detailed(
            contact_id=contact_id,
            client=client,
            body=body,
        )
    ).parsed
