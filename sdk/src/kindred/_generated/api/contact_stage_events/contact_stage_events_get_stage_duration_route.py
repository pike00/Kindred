from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.http_validation_error import HTTPValidationError
from typing import cast
from uuid import UUID
import datetime


def _get_kwargs(
    contact_id: UUID,
    stage: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/v1/contacts/{contact_id}/stage-duration/{stage}".format(
            contact_id=quote(str(contact_id), safe=""),
            stage=quote(str(stage), safe=""),
        ),
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> HTTPValidationError | list[list[datetime.datetime | float | None]] | None:
    if response.status_code == 200:
        response_200 = []
        _response_200 = response.json()
        for response_200_item_data in _response_200:
            response_200_item = []
            _response_200_item = response_200_item_data
            for response_200_item_item_data in _response_200_item:

                def _parse_response_200_item_item(data: object) -> datetime.datetime | float | None:
                    if data is None:
                        return data
                    try:
                        if not isinstance(data, str):
                            raise TypeError()
                        response_200_item_item_type_0 = datetime.datetime.fromisoformat(data)

                        return response_200_item_item_type_0
                    except (TypeError, ValueError, AttributeError, KeyError):
                        pass
                    return cast(datetime.datetime | float | None, data)

                response_200_item_item = _parse_response_200_item_item(response_200_item_item_data)

                response_200_item.append(response_200_item_item)

            response_200.append(response_200_item)

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
) -> Response[HTTPValidationError | list[list[datetime.datetime | float | None]]]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    contact_id: UUID,
    stage: str,
    *,
    client: AuthenticatedClient,
) -> Response[HTTPValidationError | list[list[datetime.datetime | float | None]]]:
    """Get Stage Duration Route

     Get dwell times for a specific stage.

    Returns a list of ``(entered_at, exited_at, duration_seconds)`` tuples.
    ``exited_at`` is ``None`` when the contact is still in that stage.

    Args:
        contact_id (UUID):
        stage (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | list[list[datetime.datetime | float | None]]]
    """

    kwargs = _get_kwargs(
        contact_id=contact_id,
        stage=stage,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    contact_id: UUID,
    stage: str,
    *,
    client: AuthenticatedClient,
) -> HTTPValidationError | list[list[datetime.datetime | float | None]] | None:
    """Get Stage Duration Route

     Get dwell times for a specific stage.

    Returns a list of ``(entered_at, exited_at, duration_seconds)`` tuples.
    ``exited_at`` is ``None`` when the contact is still in that stage.

    Args:
        contact_id (UUID):
        stage (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | list[list[datetime.datetime | float | None]]
    """

    return sync_detailed(
        contact_id=contact_id,
        stage=stage,
        client=client,
    ).parsed


async def asyncio_detailed(
    contact_id: UUID,
    stage: str,
    *,
    client: AuthenticatedClient,
) -> Response[HTTPValidationError | list[list[datetime.datetime | float | None]]]:
    """Get Stage Duration Route

     Get dwell times for a specific stage.

    Returns a list of ``(entered_at, exited_at, duration_seconds)`` tuples.
    ``exited_at`` is ``None`` when the contact is still in that stage.

    Args:
        contact_id (UUID):
        stage (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | list[list[datetime.datetime | float | None]]]
    """

    kwargs = _get_kwargs(
        contact_id=contact_id,
        stage=stage,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    contact_id: UUID,
    stage: str,
    *,
    client: AuthenticatedClient,
) -> HTTPValidationError | list[list[datetime.datetime | float | None]] | None:
    """Get Stage Duration Route

     Get dwell times for a specific stage.

    Returns a list of ``(entered_at, exited_at, duration_seconds)`` tuples.
    ``exited_at`` is ``None`` when the contact is still in that stage.

    Args:
        contact_id (UUID):
        stage (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | list[list[datetime.datetime | float | None]]
    """

    return (
        await asyncio_detailed(
            contact_id=contact_id,
            stage=stage,
            client=client,
        )
    ).parsed
