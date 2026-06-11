from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.email_gmail_authorize_response_email_gmail_authorize import (
    EmailGmailAuthorizeResponseEmailGmailAuthorize,
)
from ...models.http_validation_error import HTTPValidationError
from typing import cast
from uuid import UUID


def _get_kwargs(
    *,
    contact_id: UUID,
    email_address: str,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    json_contact_id = str(contact_id)
    params["contact_id"] = json_contact_id

    params["email_address"] = email_address

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/v1/email/oauth/authorize",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> EmailGmailAuthorizeResponseEmailGmailAuthorize | HTTPValidationError | None:
    if response.status_code == 200:
        response_200 = EmailGmailAuthorizeResponseEmailGmailAuthorize.from_dict(response.json())

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
) -> Response[EmailGmailAuthorizeResponseEmailGmailAuthorize | HTTPValidationError]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient,
    contact_id: UUID,
    email_address: str,
) -> Response[EmailGmailAuthorizeResponseEmailGmailAuthorize | HTTPValidationError]:
    """Gmail Authorize

     Get Gmail OAuth2 authorization URL.

    The state parameter will encode the contact_id and email_address.

    Args:
        contact_id (UUID): Contact ID to associate with this email
        email_address (str): Email address being authorized

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[EmailGmailAuthorizeResponseEmailGmailAuthorize | HTTPValidationError]
    """

    kwargs = _get_kwargs(
        contact_id=contact_id,
        email_address=email_address,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient,
    contact_id: UUID,
    email_address: str,
) -> EmailGmailAuthorizeResponseEmailGmailAuthorize | HTTPValidationError | None:
    """Gmail Authorize

     Get Gmail OAuth2 authorization URL.

    The state parameter will encode the contact_id and email_address.

    Args:
        contact_id (UUID): Contact ID to associate with this email
        email_address (str): Email address being authorized

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        EmailGmailAuthorizeResponseEmailGmailAuthorize | HTTPValidationError
    """

    return sync_detailed(
        client=client,
        contact_id=contact_id,
        email_address=email_address,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient,
    contact_id: UUID,
    email_address: str,
) -> Response[EmailGmailAuthorizeResponseEmailGmailAuthorize | HTTPValidationError]:
    """Gmail Authorize

     Get Gmail OAuth2 authorization URL.

    The state parameter will encode the contact_id and email_address.

    Args:
        contact_id (UUID): Contact ID to associate with this email
        email_address (str): Email address being authorized

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[EmailGmailAuthorizeResponseEmailGmailAuthorize | HTTPValidationError]
    """

    kwargs = _get_kwargs(
        contact_id=contact_id,
        email_address=email_address,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient,
    contact_id: UUID,
    email_address: str,
) -> EmailGmailAuthorizeResponseEmailGmailAuthorize | HTTPValidationError | None:
    """Gmail Authorize

     Get Gmail OAuth2 authorization URL.

    The state parameter will encode the contact_id and email_address.

    Args:
        contact_id (UUID): Contact ID to associate with this email
        email_address (str): Email address being authorized

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        EmailGmailAuthorizeResponseEmailGmailAuthorize | HTTPValidationError
    """

    return (
        await asyncio_detailed(
            client=client,
            contact_id=contact_id,
            email_address=email_address,
        )
    ).parsed
