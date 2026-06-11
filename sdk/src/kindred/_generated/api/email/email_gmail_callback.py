from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.email_gmail_callback_response_email_gmail_callback import (
    EmailGmailCallbackResponseEmailGmailCallback,
)
from ...models.http_validation_error import HTTPValidationError
from typing import cast


def _get_kwargs(
    *,
    code: str,
    state: str,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["code"] = code

    params["state"] = state

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/v1/email/oauth/callback",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> EmailGmailCallbackResponseEmailGmailCallback | HTTPValidationError | None:
    if response.status_code == 200:
        response_200 = EmailGmailCallbackResponseEmailGmailCallback.from_dict(response.json())

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
) -> Response[EmailGmailCallbackResponseEmailGmailCallback | HTTPValidationError]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient,
    code: str,
    state: str,
) -> Response[EmailGmailCallbackResponseEmailGmailCallback | HTTPValidationError]:
    r"""Gmail Callback

     Handle Gmail OAuth2 callback and store encrypted tokens.

    State format: \"{contact_id}:{email_address}\"

    Args:
        code (str):
        state (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[EmailGmailCallbackResponseEmailGmailCallback | HTTPValidationError]
    """

    kwargs = _get_kwargs(
        code=code,
        state=state,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient,
    code: str,
    state: str,
) -> EmailGmailCallbackResponseEmailGmailCallback | HTTPValidationError | None:
    r"""Gmail Callback

     Handle Gmail OAuth2 callback and store encrypted tokens.

    State format: \"{contact_id}:{email_address}\"

    Args:
        code (str):
        state (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        EmailGmailCallbackResponseEmailGmailCallback | HTTPValidationError
    """

    return sync_detailed(
        client=client,
        code=code,
        state=state,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient,
    code: str,
    state: str,
) -> Response[EmailGmailCallbackResponseEmailGmailCallback | HTTPValidationError]:
    r"""Gmail Callback

     Handle Gmail OAuth2 callback and store encrypted tokens.

    State format: \"{contact_id}:{email_address}\"

    Args:
        code (str):
        state (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[EmailGmailCallbackResponseEmailGmailCallback | HTTPValidationError]
    """

    kwargs = _get_kwargs(
        code=code,
        state=state,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient,
    code: str,
    state: str,
) -> EmailGmailCallbackResponseEmailGmailCallback | HTTPValidationError | None:
    r"""Gmail Callback

     Handle Gmail OAuth2 callback and store encrypted tokens.

    State format: \"{contact_id}:{email_address}\"

    Args:
        code (str):
        state (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        EmailGmailCallbackResponseEmailGmailCallback | HTTPValidationError
    """

    return (
        await asyncio_detailed(
            client=client,
            code=code,
            state=state,
        )
    ).parsed
