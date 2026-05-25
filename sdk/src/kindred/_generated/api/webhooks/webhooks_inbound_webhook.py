from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.http_validation_error import HTTPValidationError
from ...models.webhook_event_response import WebhookEventResponse
from ...models.webhooks_inbound_webhook_payload import WebhooksInboundWebhookPayload
from typing import cast


def _get_kwargs(
    api_key: str,
    *,
    body: WebhooksInboundWebhookPayload,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/api/v1/webhooks/inbound/{api_key}".format(
            api_key=quote(str(api_key), safe=""),
        ),
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
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
    body: WebhooksInboundWebhookPayload,
) -> Response[HTTPValidationError | WebhookEventResponse]:
    r"""Inbound Webhook

     Inbound webhook receiver for external integrations (n8n, Aqara, etc.).

    Payload format:
    {
        \"contact_email\": \"user@example.com\",  // OR
        \"contact_name\": \"John Doe\",           // lookup by name
        \"channel\": \"call\",                     // InteractionChannel value
        \"notes\": \"Called about project X\",     // optional
        \"occurred_at\": \"2024-01-15T10:00:00Z\"  // optional, defaults to now
    }

    Args:
        api_key (str):
        body (WebhooksInboundWebhookPayload):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | WebhookEventResponse]
    """

    kwargs = _get_kwargs(
        api_key=api_key,
        body=body,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    api_key: str,
    *,
    client: AuthenticatedClient | Client,
    body: WebhooksInboundWebhookPayload,
) -> HTTPValidationError | WebhookEventResponse | None:
    r"""Inbound Webhook

     Inbound webhook receiver for external integrations (n8n, Aqara, etc.).

    Payload format:
    {
        \"contact_email\": \"user@example.com\",  // OR
        \"contact_name\": \"John Doe\",           // lookup by name
        \"channel\": \"call\",                     // InteractionChannel value
        \"notes\": \"Called about project X\",     // optional
        \"occurred_at\": \"2024-01-15T10:00:00Z\"  // optional, defaults to now
    }

    Args:
        api_key (str):
        body (WebhooksInboundWebhookPayload):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | WebhookEventResponse
    """

    return sync_detailed(
        api_key=api_key,
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    api_key: str,
    *,
    client: AuthenticatedClient | Client,
    body: WebhooksInboundWebhookPayload,
) -> Response[HTTPValidationError | WebhookEventResponse]:
    r"""Inbound Webhook

     Inbound webhook receiver for external integrations (n8n, Aqara, etc.).

    Payload format:
    {
        \"contact_email\": \"user@example.com\",  // OR
        \"contact_name\": \"John Doe\",           // lookup by name
        \"channel\": \"call\",                     // InteractionChannel value
        \"notes\": \"Called about project X\",     // optional
        \"occurred_at\": \"2024-01-15T10:00:00Z\"  // optional, defaults to now
    }

    Args:
        api_key (str):
        body (WebhooksInboundWebhookPayload):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | WebhookEventResponse]
    """

    kwargs = _get_kwargs(
        api_key=api_key,
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    api_key: str,
    *,
    client: AuthenticatedClient | Client,
    body: WebhooksInboundWebhookPayload,
) -> HTTPValidationError | WebhookEventResponse | None:
    r"""Inbound Webhook

     Inbound webhook receiver for external integrations (n8n, Aqara, etc.).

    Payload format:
    {
        \"contact_email\": \"user@example.com\",  // OR
        \"contact_name\": \"John Doe\",           // lookup by name
        \"channel\": \"call\",                     // InteractionChannel value
        \"notes\": \"Called about project X\",     // optional
        \"occurred_at\": \"2024-01-15T10:00:00Z\"  // optional, defaults to now
    }

    Args:
        api_key (str):
        body (WebhooksInboundWebhookPayload):

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
            body=body,
        )
    ).parsed
