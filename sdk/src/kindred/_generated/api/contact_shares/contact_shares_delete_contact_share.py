from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.contact_shares_delete_contact_share_response_contact_shares_delete_contact_share import (
    ContactSharesDeleteContactShareResponseContactSharesDeleteContactShare,
)
from ...models.http_validation_error import HTTPValidationError
from typing import cast
from uuid import UUID


def _get_kwargs(
    grantee_id: UUID,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "delete",
        "url": "/api/v1/contact-shares/{grantee_id}".format(
            grantee_id=quote(str(grantee_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> ContactSharesDeleteContactShareResponseContactSharesDeleteContactShare | HTTPValidationError | None:
    if response.status_code == 200:
        response_200 = ContactSharesDeleteContactShareResponseContactSharesDeleteContactShare.from_dict(
            response.json()
        )

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
) -> Response[ContactSharesDeleteContactShareResponseContactSharesDeleteContactShare | HTTPValidationError]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    grantee_id: UUID,
    *,
    client: AuthenticatedClient,
) -> Response[ContactSharesDeleteContactShareResponseContactSharesDeleteContactShare | HTTPValidationError]:
    """Delete Contact Share

    Args:
        grantee_id (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[ContactSharesDeleteContactShareResponseContactSharesDeleteContactShare | HTTPValidationError]
    """

    kwargs = _get_kwargs(
        grantee_id=grantee_id,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    grantee_id: UUID,
    *,
    client: AuthenticatedClient,
) -> ContactSharesDeleteContactShareResponseContactSharesDeleteContactShare | HTTPValidationError | None:
    """Delete Contact Share

    Args:
        grantee_id (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ContactSharesDeleteContactShareResponseContactSharesDeleteContactShare | HTTPValidationError
    """

    return sync_detailed(
        grantee_id=grantee_id,
        client=client,
    ).parsed


async def asyncio_detailed(
    grantee_id: UUID,
    *,
    client: AuthenticatedClient,
) -> Response[ContactSharesDeleteContactShareResponseContactSharesDeleteContactShare | HTTPValidationError]:
    """Delete Contact Share

    Args:
        grantee_id (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[ContactSharesDeleteContactShareResponseContactSharesDeleteContactShare | HTTPValidationError]
    """

    kwargs = _get_kwargs(
        grantee_id=grantee_id,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    grantee_id: UUID,
    *,
    client: AuthenticatedClient,
) -> ContactSharesDeleteContactShareResponseContactSharesDeleteContactShare | HTTPValidationError | None:
    """Delete Contact Share

    Args:
        grantee_id (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ContactSharesDeleteContactShareResponseContactSharesDeleteContactShare | HTTPValidationError
    """

    return (
        await asyncio_detailed(
            grantee_id=grantee_id,
            client=client,
        )
    ).parsed
