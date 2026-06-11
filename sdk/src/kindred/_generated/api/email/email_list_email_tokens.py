from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.email_o_auth_tokens_public import EmailOAuthTokensPublic
from ...models.http_validation_error import HTTPValidationError
from ...types import UNSET, Unset
from typing import cast
from uuid import UUID


def _get_kwargs(
    *,
    contact_id: None | Unset | UUID = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    json_contact_id: None | str | Unset
    if isinstance(contact_id, Unset):
        json_contact_id = UNSET
    elif isinstance(contact_id, UUID):
        json_contact_id = str(contact_id)
    else:
        json_contact_id = contact_id
    params["contact_id"] = json_contact_id

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/v1/email/tokens",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> EmailOAuthTokensPublic | HTTPValidationError | None:
    if response.status_code == 200:
        response_200 = EmailOAuthTokensPublic.from_dict(response.json())

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
) -> Response[EmailOAuthTokensPublic | HTTPValidationError]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient,
    contact_id: None | Unset | UUID = UNSET,
) -> Response[EmailOAuthTokensPublic | HTTPValidationError]:
    """List Email Tokens

     List configured email OAuth tokens for the current user.

    Args:
        contact_id (None | Unset | UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[EmailOAuthTokensPublic | HTTPValidationError]
    """

    kwargs = _get_kwargs(
        contact_id=contact_id,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient,
    contact_id: None | Unset | UUID = UNSET,
) -> EmailOAuthTokensPublic | HTTPValidationError | None:
    """List Email Tokens

     List configured email OAuth tokens for the current user.

    Args:
        contact_id (None | Unset | UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        EmailOAuthTokensPublic | HTTPValidationError
    """

    return sync_detailed(
        client=client,
        contact_id=contact_id,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient,
    contact_id: None | Unset | UUID = UNSET,
) -> Response[EmailOAuthTokensPublic | HTTPValidationError]:
    """List Email Tokens

     List configured email OAuth tokens for the current user.

    Args:
        contact_id (None | Unset | UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[EmailOAuthTokensPublic | HTTPValidationError]
    """

    kwargs = _get_kwargs(
        contact_id=contact_id,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient,
    contact_id: None | Unset | UUID = UNSET,
) -> EmailOAuthTokensPublic | HTTPValidationError | None:
    """List Email Tokens

     List configured email OAuth tokens for the current user.

    Args:
        contact_id (None | Unset | UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        EmailOAuthTokensPublic | HTTPValidationError
    """

    return (
        await asyncio_detailed(
            client=client,
            contact_id=contact_id,
        )
    ).parsed
