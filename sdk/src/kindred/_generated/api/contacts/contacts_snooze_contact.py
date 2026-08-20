from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.contact_public import ContactPublic
from ...models.contact_snooze_request import ContactSnoozeRequest
from ...models.http_validation_error import HTTPValidationError
from ...types import UNSET, Unset
from typing import cast
from uuid import UUID


def _get_kwargs(
    contact_id: UUID,
    *,
    body: ContactSnoozeRequest | None | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "patch",
        "url": "/api/v1/contacts/{contact_id}/snooze".format(
            contact_id=quote(str(contact_id), safe=""),
        ),
    }

    if isinstance(body, ContactSnoozeRequest):
        _kwargs["json"] = body.to_dict()
    else:
        _kwargs["json"] = body

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> ContactPublic | HTTPValidationError | None:
    if response.status_code == 200:
        response_200 = ContactPublic.from_dict(response.json())

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
) -> Response[ContactPublic | HTTPValidationError]:
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
    body: ContactSnoozeRequest | None | Unset = UNSET,
) -> Response[ContactPublic | HTTPValidationError]:
    """Snooze Contact

     Snooze a contact for a specified duration ('1w', '2w', '1m', '3m', '6m', 'indefinitely') or explicit
    datetime.

    Args:
        contact_id (UUID):
        body (ContactSnoozeRequest | None | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[ContactPublic | HTTPValidationError]
    """

    kwargs = _get_kwargs(
        contact_id=contact_id,
        body=body,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    contact_id: UUID,
    *,
    client: AuthenticatedClient,
    body: ContactSnoozeRequest | None | Unset = UNSET,
) -> ContactPublic | HTTPValidationError | None:
    """Snooze Contact

     Snooze a contact for a specified duration ('1w', '2w', '1m', '3m', '6m', 'indefinitely') or explicit
    datetime.

    Args:
        contact_id (UUID):
        body (ContactSnoozeRequest | None | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ContactPublic | HTTPValidationError
    """

    return sync_detailed(
        contact_id=contact_id,
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    contact_id: UUID,
    *,
    client: AuthenticatedClient,
    body: ContactSnoozeRequest | None | Unset = UNSET,
) -> Response[ContactPublic | HTTPValidationError]:
    """Snooze Contact

     Snooze a contact for a specified duration ('1w', '2w', '1m', '3m', '6m', 'indefinitely') or explicit
    datetime.

    Args:
        contact_id (UUID):
        body (ContactSnoozeRequest | None | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[ContactPublic | HTTPValidationError]
    """

    kwargs = _get_kwargs(
        contact_id=contact_id,
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    contact_id: UUID,
    *,
    client: AuthenticatedClient,
    body: ContactSnoozeRequest | None | Unset = UNSET,
) -> ContactPublic | HTTPValidationError | None:
    """Snooze Contact

     Snooze a contact for a specified duration ('1w', '2w', '1m', '3m', '6m', 'indefinitely') or explicit
    datetime.

    Args:
        contact_id (UUID):
        body (ContactSnoozeRequest | None | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ContactPublic | HTTPValidationError
    """

    return (
        await asyncio_detailed(
            contact_id=contact_id,
            client=client,
            body=body,
        )
    ).parsed
