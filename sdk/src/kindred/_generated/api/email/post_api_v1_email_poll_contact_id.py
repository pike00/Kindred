from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.http_validation_error import HTTPValidationError
from ...models.post_api_v1_email_poll_contact_id_response_post_api_v1_email_poll_contact_id import (
    PostApiV1EmailPollContactIdResponsePostApiV1EmailPollContactId,
)
from typing import cast
from uuid import UUID


def _get_kwargs(
    contact_id: UUID,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/api/v1/email/poll/{contact_id}".format(
            contact_id=quote(str(contact_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> HTTPValidationError | PostApiV1EmailPollContactIdResponsePostApiV1EmailPollContactId | None:
    if response.status_code == 200:
        response_200 = PostApiV1EmailPollContactIdResponsePostApiV1EmailPollContactId.from_dict(
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
) -> Response[HTTPValidationError | PostApiV1EmailPollContactIdResponsePostApiV1EmailPollContactId]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    contact_id: UUID,
    *,
    client: AuthenticatedClient,
) -> Response[HTTPValidationError | PostApiV1EmailPollContactIdResponsePostApiV1EmailPollContactId]:
    """Poll Contact Email

     Manually trigger email polling for a contact.

    Processes emails and creates Interaction records for matched messages.

    Args:
        contact_id (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | PostApiV1EmailPollContactIdResponsePostApiV1EmailPollContactId]
    """

    kwargs = _get_kwargs(
        contact_id=contact_id,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    contact_id: UUID,
    *,
    client: AuthenticatedClient,
) -> HTTPValidationError | PostApiV1EmailPollContactIdResponsePostApiV1EmailPollContactId | None:
    """Poll Contact Email

     Manually trigger email polling for a contact.

    Processes emails and creates Interaction records for matched messages.

    Args:
        contact_id (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | PostApiV1EmailPollContactIdResponsePostApiV1EmailPollContactId
    """

    return sync_detailed(
        contact_id=contact_id,
        client=client,
    ).parsed


async def asyncio_detailed(
    contact_id: UUID,
    *,
    client: AuthenticatedClient,
) -> Response[HTTPValidationError | PostApiV1EmailPollContactIdResponsePostApiV1EmailPollContactId]:
    """Poll Contact Email

     Manually trigger email polling for a contact.

    Processes emails and creates Interaction records for matched messages.

    Args:
        contact_id (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | PostApiV1EmailPollContactIdResponsePostApiV1EmailPollContactId]
    """

    kwargs = _get_kwargs(
        contact_id=contact_id,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    contact_id: UUID,
    *,
    client: AuthenticatedClient,
) -> HTTPValidationError | PostApiV1EmailPollContactIdResponsePostApiV1EmailPollContactId | None:
    """Poll Contact Email

     Manually trigger email polling for a contact.

    Processes emails and creates Interaction records for matched messages.

    Args:
        contact_id (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | PostApiV1EmailPollContactIdResponsePostApiV1EmailPollContactId
    """

    return (
        await asyncio_detailed(
            contact_id=contact_id,
            client=client,
        )
    ).parsed
