from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.contact_stage_events_get_stage_analytics_response_contact_stage_events_get_stage_analytics import (
    ContactStageEventsGetStageAnalyticsResponseContactStageEventsGetStageAnalytics,
)
from ...models.http_validation_error import HTTPValidationError
from typing import cast
from uuid import UUID


def _get_kwargs(
    contact_id: UUID,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/v1/contacts/{contact_id}/stage-analytics".format(
            contact_id=quote(str(contact_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> (
    ContactStageEventsGetStageAnalyticsResponseContactStageEventsGetStageAnalytics
    | HTTPValidationError
    | None
):
    if response.status_code == 200:
        response_200 = (
            ContactStageEventsGetStageAnalyticsResponseContactStageEventsGetStageAnalytics.from_dict(
                response.json()
            )
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
    ContactStageEventsGetStageAnalyticsResponseContactStageEventsGetStageAnalytics | HTTPValidationError
]:
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
) -> Response[
    ContactStageEventsGetStageAnalyticsResponseContactStageEventsGetStageAnalytics | HTTPValidationError
]:
    """Get Stage Analytics

     Get aggregate dwell time per stage for a contact.

    Returns a dict keyed by stage name, where each value is a list of
    ``[entered_at, exited_at, duration_seconds]`` lists for every dwell
    in that stage. A contact may re-enter the same stage multiple times.

    Args:
        contact_id (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[ContactStageEventsGetStageAnalyticsResponseContactStageEventsGetStageAnalytics | HTTPValidationError]
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
) -> (
    ContactStageEventsGetStageAnalyticsResponseContactStageEventsGetStageAnalytics
    | HTTPValidationError
    | None
):
    """Get Stage Analytics

     Get aggregate dwell time per stage for a contact.

    Returns a dict keyed by stage name, where each value is a list of
    ``[entered_at, exited_at, duration_seconds]`` lists for every dwell
    in that stage. A contact may re-enter the same stage multiple times.

    Args:
        contact_id (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ContactStageEventsGetStageAnalyticsResponseContactStageEventsGetStageAnalytics | HTTPValidationError
    """

    return sync_detailed(
        contact_id=contact_id,
        client=client,
    ).parsed


async def asyncio_detailed(
    contact_id: UUID,
    *,
    client: AuthenticatedClient,
) -> Response[
    ContactStageEventsGetStageAnalyticsResponseContactStageEventsGetStageAnalytics | HTTPValidationError
]:
    """Get Stage Analytics

     Get aggregate dwell time per stage for a contact.

    Returns a dict keyed by stage name, where each value is a list of
    ``[entered_at, exited_at, duration_seconds]`` lists for every dwell
    in that stage. A contact may re-enter the same stage multiple times.

    Args:
        contact_id (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[ContactStageEventsGetStageAnalyticsResponseContactStageEventsGetStageAnalytics | HTTPValidationError]
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
) -> (
    ContactStageEventsGetStageAnalyticsResponseContactStageEventsGetStageAnalytics
    | HTTPValidationError
    | None
):
    """Get Stage Analytics

     Get aggregate dwell time per stage for a contact.

    Returns a dict keyed by stage name, where each value is a list of
    ``[entered_at, exited_at, duration_seconds]`` lists for every dwell
    in that stage. A contact may re-enter the same stage multiple times.

    Args:
        contact_id (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ContactStageEventsGetStageAnalyticsResponseContactStageEventsGetStageAnalytics | HTTPValidationError
    """

    return (
        await asyncio_detailed(
            contact_id=contact_id,
            client=client,
        )
    ).parsed
