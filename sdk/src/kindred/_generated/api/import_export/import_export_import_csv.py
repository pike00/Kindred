from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.body_import_export_import_csv import BodyImportExportImportCsv
from ...models.csv_import_response import CSVImportResponse
from ...models.http_validation_error import HTTPValidationError
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    body: BodyImportExportImportCsv,
    skip_duplicates: bool | Unset = True,
    merge_duplicates: bool | Unset = False,
    create_missing_tags: bool | Unset = True,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    params: dict[str, Any] = {}

    params["skip_duplicates"] = skip_duplicates

    params["merge_duplicates"] = merge_duplicates

    params["create_missing_tags"] = create_missing_tags

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/api/v1/import-export/import/csv",
        "params": params,
    }

    _kwargs["files"] = body.to_multipart()

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> CSVImportResponse | HTTPValidationError | None:
    if response.status_code == 200:
        response_200 = CSVImportResponse.from_dict(response.json())

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
) -> Response[CSVImportResponse | HTTPValidationError]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient,
    body: BodyImportExportImportCsv,
    skip_duplicates: bool | Unset = True,
    merge_duplicates: bool | Unset = False,
    create_missing_tags: bool | Unset = True,
) -> Response[CSVImportResponse | HTTPValidationError]:
    """Import Csv

     Import contacts from a CSV file.

    - **column_mapping**: Optional override for auto-detected column mapping.
    - **skip_duplicates**: Skip contacts with matching email (default: True).
    - **merge_duplicates**: Update existing contacts with matching email (default: False).
    - **create_missing_tags**: Auto-create tags that don't exist (default: True).

    Args:
        skip_duplicates (bool | Unset):  Default: True.
        merge_duplicates (bool | Unset):  Default: False.
        create_missing_tags (bool | Unset):  Default: True.
        body (BodyImportExportImportCsv):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[CSVImportResponse | HTTPValidationError]
    """

    kwargs = _get_kwargs(
        body=body,
        skip_duplicates=skip_duplicates,
        merge_duplicates=merge_duplicates,
        create_missing_tags=create_missing_tags,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient,
    body: BodyImportExportImportCsv,
    skip_duplicates: bool | Unset = True,
    merge_duplicates: bool | Unset = False,
    create_missing_tags: bool | Unset = True,
) -> CSVImportResponse | HTTPValidationError | None:
    """Import Csv

     Import contacts from a CSV file.

    - **column_mapping**: Optional override for auto-detected column mapping.
    - **skip_duplicates**: Skip contacts with matching email (default: True).
    - **merge_duplicates**: Update existing contacts with matching email (default: False).
    - **create_missing_tags**: Auto-create tags that don't exist (default: True).

    Args:
        skip_duplicates (bool | Unset):  Default: True.
        merge_duplicates (bool | Unset):  Default: False.
        create_missing_tags (bool | Unset):  Default: True.
        body (BodyImportExportImportCsv):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        CSVImportResponse | HTTPValidationError
    """

    return sync_detailed(
        client=client,
        body=body,
        skip_duplicates=skip_duplicates,
        merge_duplicates=merge_duplicates,
        create_missing_tags=create_missing_tags,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient,
    body: BodyImportExportImportCsv,
    skip_duplicates: bool | Unset = True,
    merge_duplicates: bool | Unset = False,
    create_missing_tags: bool | Unset = True,
) -> Response[CSVImportResponse | HTTPValidationError]:
    """Import Csv

     Import contacts from a CSV file.

    - **column_mapping**: Optional override for auto-detected column mapping.
    - **skip_duplicates**: Skip contacts with matching email (default: True).
    - **merge_duplicates**: Update existing contacts with matching email (default: False).
    - **create_missing_tags**: Auto-create tags that don't exist (default: True).

    Args:
        skip_duplicates (bool | Unset):  Default: True.
        merge_duplicates (bool | Unset):  Default: False.
        create_missing_tags (bool | Unset):  Default: True.
        body (BodyImportExportImportCsv):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[CSVImportResponse | HTTPValidationError]
    """

    kwargs = _get_kwargs(
        body=body,
        skip_duplicates=skip_duplicates,
        merge_duplicates=merge_duplicates,
        create_missing_tags=create_missing_tags,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient,
    body: BodyImportExportImportCsv,
    skip_duplicates: bool | Unset = True,
    merge_duplicates: bool | Unset = False,
    create_missing_tags: bool | Unset = True,
) -> CSVImportResponse | HTTPValidationError | None:
    """Import Csv

     Import contacts from a CSV file.

    - **column_mapping**: Optional override for auto-detected column mapping.
    - **skip_duplicates**: Skip contacts with matching email (default: True).
    - **merge_duplicates**: Update existing contacts with matching email (default: False).
    - **create_missing_tags**: Auto-create tags that don't exist (default: True).

    Args:
        skip_duplicates (bool | Unset):  Default: True.
        merge_duplicates (bool | Unset):  Default: False.
        create_missing_tags (bool | Unset):  Default: True.
        body (BodyImportExportImportCsv):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        CSVImportResponse | HTTPValidationError
    """

    return (
        await asyncio_detailed(
            client=client,
            body=body,
            skip_duplicates=skip_duplicates,
            merge_duplicates=merge_duplicates,
            create_missing_tags=create_missing_tags,
        )
    ).parsed
