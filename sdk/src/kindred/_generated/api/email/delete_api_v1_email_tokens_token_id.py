from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.delete_api_v1_email_tokens_token_id_response_delete_api_v1_email_tokens_token_id import (
    DeleteApiV1EmailTokensTokenIdResponseDeleteApiV1EmailTokensTokenId,
)
from ...models.http_validation_error import HTTPValidationError
from typing import cast
from uuid import UUID


def _get_kwargs(
    token_id: UUID,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "delete",
        "url": "/api/v1/email/tokens/{token_id}".format(
            token_id=quote(str(token_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> DeleteApiV1EmailTokensTokenIdResponseDeleteApiV1EmailTokensTokenId | HTTPValidationError | None:
    if response.status_code == 200:
        response_200 = DeleteApiV1EmailTokensTokenIdResponseDeleteApiV1EmailTokensTokenId.from_dict(
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
) -> Response[DeleteApiV1EmailTokensTokenIdResponseDeleteApiV1EmailTokensTokenId | HTTPValidationError]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    token_id: UUID,
    *,
    client: AuthenticatedClient,
) -> Response[DeleteApiV1EmailTokensTokenIdResponseDeleteApiV1EmailTokensTokenId | HTTPValidationError]:
    """Delete Email Token

     Delete an email OAuth token.

    Args:
        token_id (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[DeleteApiV1EmailTokensTokenIdResponseDeleteApiV1EmailTokensTokenId | HTTPValidationError]
    """

    kwargs = _get_kwargs(
        token_id=token_id,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    token_id: UUID,
    *,
    client: AuthenticatedClient,
) -> DeleteApiV1EmailTokensTokenIdResponseDeleteApiV1EmailTokensTokenId | HTTPValidationError | None:
    """Delete Email Token

     Delete an email OAuth token.

    Args:
        token_id (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        DeleteApiV1EmailTokensTokenIdResponseDeleteApiV1EmailTokensTokenId | HTTPValidationError
    """

    return sync_detailed(
        token_id=token_id,
        client=client,
    ).parsed


async def asyncio_detailed(
    token_id: UUID,
    *,
    client: AuthenticatedClient,
) -> Response[DeleteApiV1EmailTokensTokenIdResponseDeleteApiV1EmailTokensTokenId | HTTPValidationError]:
    """Delete Email Token

     Delete an email OAuth token.

    Args:
        token_id (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[DeleteApiV1EmailTokensTokenIdResponseDeleteApiV1EmailTokensTokenId | HTTPValidationError]
    """

    kwargs = _get_kwargs(
        token_id=token_id,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    token_id: UUID,
    *,
    client: AuthenticatedClient,
) -> DeleteApiV1EmailTokensTokenIdResponseDeleteApiV1EmailTokensTokenId | HTTPValidationError | None:
    """Delete Email Token

     Delete an email OAuth token.

    Args:
        token_id (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        DeleteApiV1EmailTokensTokenIdResponseDeleteApiV1EmailTokensTokenId | HTTPValidationError
    """

    return (
        await asyncio_detailed(
            token_id=token_id,
            client=client,
        )
    ).parsed
