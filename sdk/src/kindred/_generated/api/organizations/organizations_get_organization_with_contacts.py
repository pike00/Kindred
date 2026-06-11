from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.http_validation_error import HTTPValidationError
from ...models.organizations_get_organization_with_contacts_response_organizations_get_organization_with_contacts import (
    OrganizationsGetOrganizationWithContactsResponseOrganizationsGetOrganizationWithContacts,
)
from typing import cast
from uuid import UUID


def _get_kwargs(
    organization_id: UUID,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/v1/organizations/{organization_id}/contacts".format(
            organization_id=quote(str(organization_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> (
    HTTPValidationError
    | OrganizationsGetOrganizationWithContactsResponseOrganizationsGetOrganizationWithContacts
    | None
):
    if response.status_code == 200:
        response_200 = OrganizationsGetOrganizationWithContactsResponseOrganizationsGetOrganizationWithContacts.from_dict(
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
) -> Response[
    HTTPValidationError
    | OrganizationsGetOrganizationWithContactsResponseOrganizationsGetOrganizationWithContacts
]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    organization_id: UUID,
    *,
    client: AuthenticatedClient,
) -> Response[
    HTTPValidationError
    | OrganizationsGetOrganizationWithContactsResponseOrganizationsGetOrganizationWithContacts
]:
    """Get Organization With Contacts

     Get an organization and its linked contacts.

    Args:
        organization_id (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | OrganizationsGetOrganizationWithContactsResponseOrganizationsGetOrganizationWithContacts]
    """

    kwargs = _get_kwargs(
        organization_id=organization_id,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    organization_id: UUID,
    *,
    client: AuthenticatedClient,
) -> (
    HTTPValidationError
    | OrganizationsGetOrganizationWithContactsResponseOrganizationsGetOrganizationWithContacts
    | None
):
    """Get Organization With Contacts

     Get an organization and its linked contacts.

    Args:
        organization_id (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | OrganizationsGetOrganizationWithContactsResponseOrganizationsGetOrganizationWithContacts
    """

    return sync_detailed(
        organization_id=organization_id,
        client=client,
    ).parsed


async def asyncio_detailed(
    organization_id: UUID,
    *,
    client: AuthenticatedClient,
) -> Response[
    HTTPValidationError
    | OrganizationsGetOrganizationWithContactsResponseOrganizationsGetOrganizationWithContacts
]:
    """Get Organization With Contacts

     Get an organization and its linked contacts.

    Args:
        organization_id (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | OrganizationsGetOrganizationWithContactsResponseOrganizationsGetOrganizationWithContacts]
    """

    kwargs = _get_kwargs(
        organization_id=organization_id,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    organization_id: UUID,
    *,
    client: AuthenticatedClient,
) -> (
    HTTPValidationError
    | OrganizationsGetOrganizationWithContactsResponseOrganizationsGetOrganizationWithContacts
    | None
):
    """Get Organization With Contacts

     Get an organization and its linked contacts.

    Args:
        organization_id (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | OrganizationsGetOrganizationWithContactsResponseOrganizationsGetOrganizationWithContacts
    """

    return (
        await asyncio_detailed(
            organization_id=organization_id,
            client=client,
        )
    ).parsed
