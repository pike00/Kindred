from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.email_poll_all_emails_response_email_poll_all_emails import (
    EmailPollAllEmailsResponseEmailPollAllEmails,
)
from typing import cast


def _get_kwargs() -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/api/v1/email/poll/all",
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> EmailPollAllEmailsResponseEmailPollAllEmails | None:
    if response.status_code == 200:
        response_200 = EmailPollAllEmailsResponseEmailPollAllEmails.from_dict(response.json())

        return response_200

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[EmailPollAllEmailsResponseEmailPollAllEmails]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient,
) -> Response[EmailPollAllEmailsResponseEmailPollAllEmails]:
    """Poll All Emails

     Manually trigger email polling for all contacts with auto_log_email enabled.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[EmailPollAllEmailsResponseEmailPollAllEmails]
    """

    kwargs = _get_kwargs()

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient,
) -> EmailPollAllEmailsResponseEmailPollAllEmails | None:
    """Poll All Emails

     Manually trigger email polling for all contacts with auto_log_email enabled.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        EmailPollAllEmailsResponseEmailPollAllEmails
    """

    return sync_detailed(
        client=client,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient,
) -> Response[EmailPollAllEmailsResponseEmailPollAllEmails]:
    """Poll All Emails

     Manually trigger email polling for all contacts with auto_log_email enabled.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[EmailPollAllEmailsResponseEmailPollAllEmails]
    """

    kwargs = _get_kwargs()

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient,
) -> EmailPollAllEmailsResponseEmailPollAllEmails | None:
    """Poll All Emails

     Manually trigger email polling for all contacts with auto_log_email enabled.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        EmailPollAllEmailsResponseEmailPollAllEmails
    """

    return (
        await asyncio_detailed(
            client=client,
        )
    ).parsed
