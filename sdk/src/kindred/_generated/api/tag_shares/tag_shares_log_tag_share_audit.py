from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.http_validation_error import HTTPValidationError
from ...models.tag_shares_log_tag_share_audit_response_tag_shares_log_tag_share_audit import (
    TagSharesLogTagShareAuditResponseTagSharesLogTagShareAudit,
)
from typing import cast
from uuid import UUID


def _get_kwargs(
    tag_id: UUID,
    grantee_id: UUID,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/api/v1/tag-shares/{tag_id}/{grantee_id}/audit".format(
            tag_id=quote(str(tag_id), safe=""),
            grantee_id=quote(str(grantee_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> HTTPValidationError | TagSharesLogTagShareAuditResponseTagSharesLogTagShareAudit | None:
    if response.status_code == 200:
        response_200 = TagSharesLogTagShareAuditResponseTagSharesLogTagShareAudit.from_dict(response.json())

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
) -> Response[HTTPValidationError | TagSharesLogTagShareAuditResponseTagSharesLogTagShareAudit]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    tag_id: UUID,
    grantee_id: UUID,
    *,
    client: AuthenticatedClient,
) -> Response[HTTPValidationError | TagSharesLogTagShareAuditResponseTagSharesLogTagShareAudit]:
    """Log Tag Share Audit

     Log an audit entry for tag share creation (deprecated: now auto-logged).

    Args:
        tag_id (UUID):
        grantee_id (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | TagSharesLogTagShareAuditResponseTagSharesLogTagShareAudit]
    """

    kwargs = _get_kwargs(
        tag_id=tag_id,
        grantee_id=grantee_id,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    tag_id: UUID,
    grantee_id: UUID,
    *,
    client: AuthenticatedClient,
) -> HTTPValidationError | TagSharesLogTagShareAuditResponseTagSharesLogTagShareAudit | None:
    """Log Tag Share Audit

     Log an audit entry for tag share creation (deprecated: now auto-logged).

    Args:
        tag_id (UUID):
        grantee_id (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | TagSharesLogTagShareAuditResponseTagSharesLogTagShareAudit
    """

    return sync_detailed(
        tag_id=tag_id,
        grantee_id=grantee_id,
        client=client,
    ).parsed


async def asyncio_detailed(
    tag_id: UUID,
    grantee_id: UUID,
    *,
    client: AuthenticatedClient,
) -> Response[HTTPValidationError | TagSharesLogTagShareAuditResponseTagSharesLogTagShareAudit]:
    """Log Tag Share Audit

     Log an audit entry for tag share creation (deprecated: now auto-logged).

    Args:
        tag_id (UUID):
        grantee_id (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | TagSharesLogTagShareAuditResponseTagSharesLogTagShareAudit]
    """

    kwargs = _get_kwargs(
        tag_id=tag_id,
        grantee_id=grantee_id,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    tag_id: UUID,
    grantee_id: UUID,
    *,
    client: AuthenticatedClient,
) -> HTTPValidationError | TagSharesLogTagShareAuditResponseTagSharesLogTagShareAudit | None:
    """Log Tag Share Audit

     Log an audit entry for tag share creation (deprecated: now auto-logged).

    Args:
        tag_id (UUID):
        grantee_id (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | TagSharesLogTagShareAuditResponseTagSharesLogTagShareAudit
    """

    return (
        await asyncio_detailed(
            tag_id=tag_id,
            grantee_id=grantee_id,
            client=client,
        )
    ).parsed
