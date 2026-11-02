from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.custom_field_value_public import CustomFieldValuePublic
from ...models.custom_field_value_update import CustomFieldValueUpdate
from ...models.http_validation_error import HTTPValidationError
from typing import cast
from uuid import UUID


def _get_kwargs(
    value_id: UUID,
    *,
    body: CustomFieldValueUpdate,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "patch",
        "url": "/api/v1/custom-fields/values/{value_id}".format(
            value_id=quote(str(value_id), safe=""),
        ),
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> CustomFieldValuePublic | HTTPValidationError | None:
    if response.status_code == 200:
        response_200 = CustomFieldValuePublic.from_dict(response.json())

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
) -> Response[CustomFieldValuePublic | HTTPValidationError]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    value_id: UUID,
    *,
    client: AuthenticatedClient,
    body: CustomFieldValueUpdate,
) -> Response[CustomFieldValuePublic | HTTPValidationError]:
    """Update Field Value

     Update a custom field value.

    Args:
        value_id (UUID):
        body (CustomFieldValueUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[CustomFieldValuePublic | HTTPValidationError]
    """

    kwargs = _get_kwargs(
        value_id=value_id,
        body=body,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    value_id: UUID,
    *,
    client: AuthenticatedClient,
    body: CustomFieldValueUpdate,
) -> CustomFieldValuePublic | HTTPValidationError | None:
    """Update Field Value

     Update a custom field value.

    Args:
        value_id (UUID):
        body (CustomFieldValueUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        CustomFieldValuePublic | HTTPValidationError
    """

    return sync_detailed(
        value_id=value_id,
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    value_id: UUID,
    *,
    client: AuthenticatedClient,
    body: CustomFieldValueUpdate,
) -> Response[CustomFieldValuePublic | HTTPValidationError]:
    """Update Field Value

     Update a custom field value.

    Args:
        value_id (UUID):
        body (CustomFieldValueUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[CustomFieldValuePublic | HTTPValidationError]
    """

    kwargs = _get_kwargs(
        value_id=value_id,
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    value_id: UUID,
    *,
    client: AuthenticatedClient,
    body: CustomFieldValueUpdate,
) -> CustomFieldValuePublic | HTTPValidationError | None:
    """Update Field Value

     Update a custom field value.

    Args:
        value_id (UUID):
        body (CustomFieldValueUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        CustomFieldValuePublic | HTTPValidationError
    """

    return (
        await asyncio_detailed(
            value_id=value_id,
            client=client,
            body=body,
        )
    ).parsed
