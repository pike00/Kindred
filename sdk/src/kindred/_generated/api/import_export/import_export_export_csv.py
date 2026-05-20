from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.http_validation_error import HTTPValidationError
from ...types import UNSET, Unset
from typing import cast


def _get_kwargs(
    *,
    include_tags: bool | Unset = True,
    include_fields: bool | Unset = True,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["include_tags"] = include_tags

    params["include_fields"] = include_fields

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/v1/import-export/export/csv",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Any | HTTPValidationError | None:
    if response.status_code == 200:
        response_200 = response.json()
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
) -> Response[Any | HTTPValidationError]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient,
    include_tags: bool | Unset = True,
    include_fields: bool | Unset = True,
) -> Response[Any | HTTPValidationError]:
    """Export Csv

     Export all contacts as a CSV file with UTF-8 BOM for Excel compatibility.

    - **include_tags**: Include tag names column (default: True).
    - **include_fields**: Include emails and phones columns (default: True).

    Args:
        include_tags (bool | Unset):  Default: True.
        include_fields (bool | Unset):  Default: True.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | HTTPValidationError]
    """

    kwargs = _get_kwargs(
        include_tags=include_tags,
        include_fields=include_fields,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient,
    include_tags: bool | Unset = True,
    include_fields: bool | Unset = True,
) -> Any | HTTPValidationError | None:
    """Export Csv

     Export all contacts as a CSV file with UTF-8 BOM for Excel compatibility.

    - **include_tags**: Include tag names column (default: True).
    - **include_fields**: Include emails and phones columns (default: True).

    Args:
        include_tags (bool | Unset):  Default: True.
        include_fields (bool | Unset):  Default: True.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | HTTPValidationError
    """

    return sync_detailed(
        client=client,
        include_tags=include_tags,
        include_fields=include_fields,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient,
    include_tags: bool | Unset = True,
    include_fields: bool | Unset = True,
) -> Response[Any | HTTPValidationError]:
    """Export Csv

     Export all contacts as a CSV file with UTF-8 BOM for Excel compatibility.

    - **include_tags**: Include tag names column (default: True).
    - **include_fields**: Include emails and phones columns (default: True).

    Args:
        include_tags (bool | Unset):  Default: True.
        include_fields (bool | Unset):  Default: True.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | HTTPValidationError]
    """

    kwargs = _get_kwargs(
        include_tags=include_tags,
        include_fields=include_fields,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient,
    include_tags: bool | Unset = True,
    include_fields: bool | Unset = True,
) -> Any | HTTPValidationError | None:
    """Export Csv

     Export all contacts as a CSV file with UTF-8 BOM for Excel compatibility.

    - **include_tags**: Include tag names column (default: True).
    - **include_fields**: Include emails and phones columns (default: True).

    Args:
        include_tags (bool | Unset):  Default: True.
        include_fields (bool | Unset):  Default: True.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | HTTPValidationError
    """

    return (
        await asyncio_detailed(
            client=client,
            include_tags=include_tags,
            include_fields=include_fields,
        )
    ).parsed
