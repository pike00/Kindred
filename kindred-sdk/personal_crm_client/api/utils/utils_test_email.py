from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.http_validation_error import HTTPValidationError
from ...models.message import Message
from ...types import UNSET, Response


def _get_kwargs(
    *,
    email_to: str,
) -> dict[str, Any]:
    params: dict[str, Any] = {}

    params["email_to"] = email_to

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/api/v1/utils/test-email/",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> HTTPValidationError | Message | None:
    if response.status_code == 201:
        response_201 = Message.from_dict(response.json())

        return response_201

    if response.status_code == 422:
        response_422 = HTTPValidationError.from_dict(response.json())

        return response_422

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[HTTPValidationError | Message]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient,
    email_to: str,
) -> Response[HTTPValidationError | Message]:
    """Test Email

     Test emails.

    Args:
        email_to (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | Message]
    """

    kwargs = _get_kwargs(
        email_to=email_to,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient,
    email_to: str,
) -> HTTPValidationError | Message | None:
    """Test Email

     Test emails.

    Args:
        email_to (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | Message
    """

    return sync_detailed(
        client=client,
        email_to=email_to,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient,
    email_to: str,
) -> Response[HTTPValidationError | Message]:
    """Test Email

     Test emails.

    Args:
        email_to (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | Message]
    """

    kwargs = _get_kwargs(
        email_to=email_to,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient,
    email_to: str,
) -> HTTPValidationError | Message | None:
    """Test Email

     Test emails.

    Args:
        email_to (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | Message
    """

    return (
        await asyncio_detailed(
            client=client,
            email_to=email_to,
        )
    ).parsed
