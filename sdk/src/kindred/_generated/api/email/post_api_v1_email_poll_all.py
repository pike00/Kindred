from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.post_api_v1_email_poll_all_response_post_api_v1_email_poll_all import (
    PostApiV1EmailPollAllResponsePostApiV1EmailPollAll,
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
) -> PostApiV1EmailPollAllResponsePostApiV1EmailPollAll | None:
    if response.status_code == 200:
        response_200 = PostApiV1EmailPollAllResponsePostApiV1EmailPollAll.from_dict(response.json())

        return response_200

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[PostApiV1EmailPollAllResponsePostApiV1EmailPollAll]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient,
) -> Response[PostApiV1EmailPollAllResponsePostApiV1EmailPollAll]:
    """Poll All Emails

     Poll every auto-logged email account owned by the current user.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[PostApiV1EmailPollAllResponsePostApiV1EmailPollAll]
    """

    kwargs = _get_kwargs()

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient,
) -> PostApiV1EmailPollAllResponsePostApiV1EmailPollAll | None:
    """Poll All Emails

     Poll every auto-logged email account owned by the current user.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        PostApiV1EmailPollAllResponsePostApiV1EmailPollAll
    """

    return sync_detailed(
        client=client,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient,
) -> Response[PostApiV1EmailPollAllResponsePostApiV1EmailPollAll]:
    """Poll All Emails

     Poll every auto-logged email account owned by the current user.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[PostApiV1EmailPollAllResponsePostApiV1EmailPollAll]
    """

    kwargs = _get_kwargs()

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient,
) -> PostApiV1EmailPollAllResponsePostApiV1EmailPollAll | None:
    """Poll All Emails

     Poll every auto-logged email account owned by the current user.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        PostApiV1EmailPollAllResponsePostApiV1EmailPollAll
    """

    return (
        await asyncio_detailed(
            client=client,
        )
    ).parsed
