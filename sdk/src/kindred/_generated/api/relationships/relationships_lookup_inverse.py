from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.http_validation_error import HTTPValidationError
from ...models.relationships_lookup_inverse_response_relationships_lookup_inverse import (
    RelationshipsLookupInverseResponseRelationshipsLookupInverse,
)
from typing import cast


def _get_kwargs(
    *,
    type_: str,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["type"] = type_

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/v1/relationships/inverse",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> HTTPValidationError | RelationshipsLookupInverseResponseRelationshipsLookupInverse | None:
    if response.status_code == 200:
        response_200 = RelationshipsLookupInverseResponseRelationshipsLookupInverse.from_dict(response.json())

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
) -> Response[HTTPValidationError | RelationshipsLookupInverseResponseRelationshipsLookupInverse]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient,
    type_: str,
) -> Response[HTTPValidationError | RelationshipsLookupInverseResponseRelationshipsLookupInverse]:
    r"""Lookup Inverse

     Return the inferred inverse for a relationship type, or null.

    The frontend calls this before saving to decide whether to prompt
    the user for the inverse. Symmetric types (\"friend\") return
    themselves; asymmetric pairs (\"parent\") return their counterpart
    (\"child\"); unknown types return null so the UI can ask.

    Args:
        type_ (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | RelationshipsLookupInverseResponseRelationshipsLookupInverse]
    """

    kwargs = _get_kwargs(
        type_=type_,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient,
    type_: str,
) -> HTTPValidationError | RelationshipsLookupInverseResponseRelationshipsLookupInverse | None:
    r"""Lookup Inverse

     Return the inferred inverse for a relationship type, or null.

    The frontend calls this before saving to decide whether to prompt
    the user for the inverse. Symmetric types (\"friend\") return
    themselves; asymmetric pairs (\"parent\") return their counterpart
    (\"child\"); unknown types return null so the UI can ask.

    Args:
        type_ (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | RelationshipsLookupInverseResponseRelationshipsLookupInverse
    """

    return sync_detailed(
        client=client,
        type_=type_,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient,
    type_: str,
) -> Response[HTTPValidationError | RelationshipsLookupInverseResponseRelationshipsLookupInverse]:
    r"""Lookup Inverse

     Return the inferred inverse for a relationship type, or null.

    The frontend calls this before saving to decide whether to prompt
    the user for the inverse. Symmetric types (\"friend\") return
    themselves; asymmetric pairs (\"parent\") return their counterpart
    (\"child\"); unknown types return null so the UI can ask.

    Args:
        type_ (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | RelationshipsLookupInverseResponseRelationshipsLookupInverse]
    """

    kwargs = _get_kwargs(
        type_=type_,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient,
    type_: str,
) -> HTTPValidationError | RelationshipsLookupInverseResponseRelationshipsLookupInverse | None:
    r"""Lookup Inverse

     Return the inferred inverse for a relationship type, or null.

    The frontend calls this before saving to decide whether to prompt
    the user for the inverse. Symmetric types (\"friend\") return
    themselves; asymmetric pairs (\"parent\") return their counterpart
    (\"child\"); unknown types return null so the UI can ask.

    Args:
        type_ (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | RelationshipsLookupInverseResponseRelationshipsLookupInverse
    """

    return (
        await asyncio_detailed(
            client=client,
            type_=type_,
        )
    ).parsed
