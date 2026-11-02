from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.http_validation_error import HTTPValidationError
from ...models.webhook_event_response import WebhookEventResponse
from typing import cast


def _get_kwargs(
    api_key: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/api/v1/webhooks/twilio/{api_key}".format(
            api_key=quote(str(api_key), safe=""),
        ),
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> HTTPValidationError | WebhookEventResponse | None:
    if response.status_code == 200:
        response_200 = WebhookEventResponse.from_dict(response.json())

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
) -> Response[HTTPValidationError | WebhookEventResponse]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    api_key: str,
    *,
    client: AuthenticatedClient | Client,
) -> Response[HTTPValidationError | WebhookEventResponse]:
    """Twilio Webhook

     Twilio SMS and Call webhook handler.

    Verifies X-Twilio-Signature, normalizes phone numbers to E.164,
    matches to contacts, and creates Interaction records.

    For calls, this endpoint handles both initial webhook (CallSid + caller)
    and StatusCallback (call completion with duration).

    Args:
        api_key (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | WebhookEventResponse]
    """

    kwargs = _get_kwargs(
        api_key=api_key,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    api_key: str,
    *,
    client: AuthenticatedClient | Client,
) -> HTTPValidationError | WebhookEventResponse | None:
    """Twilio Webhook

     Twilio SMS and Call webhook handler.

    Verifies X-Twilio-Signature, normalizes phone numbers to E.164,
    matches to contacts, and creates Interaction records.

    For calls, this endpoint handles both initial webhook (CallSid + caller)
    and StatusCallback (call completion with duration).

    Args:
        api_key (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | WebhookEventResponse
    """

    return sync_detailed(
        api_key=api_key,
        client=client,
    ).parsed


async def asyncio_detailed(
    api_key: str,
    *,
    client: AuthenticatedClient | Client,
) -> Response[HTTPValidationError | WebhookEventResponse]:
    """Twilio Webhook

     Twilio SMS and Call webhook handler.

    Verifies X-Twilio-Signature, normalizes phone numbers to E.164,
    matches to contacts, and creates Interaction records.

    For calls, this endpoint handles both initial webhook (CallSid + caller)
    and StatusCallback (call completion with duration).

    Args:
        api_key (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | WebhookEventResponse]
    """

    kwargs = _get_kwargs(
        api_key=api_key,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    api_key: str,
    *,
    client: AuthenticatedClient | Client,
) -> HTTPValidationError | WebhookEventResponse | None:
    """Twilio Webhook

     Twilio SMS and Call webhook handler.

    Verifies X-Twilio-Signature, normalizes phone numbers to E.164,
    matches to contacts, and creates Interaction records.

    For calls, this endpoint handles both initial webhook (CallSid + caller)
    and StatusCallback (call completion with duration).

    Args:
        api_key (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | WebhookEventResponse
    """

    return (
        await asyncio_detailed(
            api_key=api_key,
            client=client,
        )
    ).parsed
