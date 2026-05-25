from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.http_validation_error import HTTPValidationError
from ...models.webhook_endpoint_base import WebhookEndpointBase
from ...models.webhook_endpoint_public import WebhookEndpointPublic
from typing import cast
from uuid import UUID


def _get_kwargs(
    webhook_id: UUID,
    *,
    body: WebhookEndpointBase,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "patch",
        "url": "/api/v1/webhooks/{webhook_id}".format(
            webhook_id=quote(str(webhook_id), safe=""),
        ),
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> HTTPValidationError | WebhookEndpointPublic | None:
    if response.status_code == 200:
        response_200 = WebhookEndpointPublic.from_dict(response.json())

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
) -> Response[HTTPValidationError | WebhookEndpointPublic]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    webhook_id: UUID,
    *,
    client: AuthenticatedClient,
    body: WebhookEndpointBase,
) -> Response[HTTPValidationError | WebhookEndpointPublic]:
    """Update Webhook

     Update a webhook endpoint.

    Args:
        webhook_id (UUID):
        body (WebhookEndpointBase):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | WebhookEndpointPublic]
    """

    kwargs = _get_kwargs(
        webhook_id=webhook_id,
        body=body,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    webhook_id: UUID,
    *,
    client: AuthenticatedClient,
    body: WebhookEndpointBase,
) -> HTTPValidationError | WebhookEndpointPublic | None:
    """Update Webhook

     Update a webhook endpoint.

    Args:
        webhook_id (UUID):
        body (WebhookEndpointBase):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | WebhookEndpointPublic
    """

    return sync_detailed(
        webhook_id=webhook_id,
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    webhook_id: UUID,
    *,
    client: AuthenticatedClient,
    body: WebhookEndpointBase,
) -> Response[HTTPValidationError | WebhookEndpointPublic]:
    """Update Webhook

     Update a webhook endpoint.

    Args:
        webhook_id (UUID):
        body (WebhookEndpointBase):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | WebhookEndpointPublic]
    """

    kwargs = _get_kwargs(
        webhook_id=webhook_id,
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    webhook_id: UUID,
    *,
    client: AuthenticatedClient,
    body: WebhookEndpointBase,
) -> HTTPValidationError | WebhookEndpointPublic | None:
    """Update Webhook

     Update a webhook endpoint.

    Args:
        webhook_id (UUID):
        body (WebhookEndpointBase):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | WebhookEndpointPublic
    """

    return (
        await asyncio_detailed(
            webhook_id=webhook_id,
            client=client,
            body=body,
        )
    ).parsed
