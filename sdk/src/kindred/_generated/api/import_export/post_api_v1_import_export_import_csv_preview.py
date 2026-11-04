from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.body_post_api_v1_import_export_import_csv_preview import (
    BodyPostApiV1ImportExportImportCsvPreview,
)
from ...models.csv_preview_response import CSVPreviewResponse
from ...models.http_validation_error import HTTPValidationError
from typing import cast


def _get_kwargs(
    *,
    body: BodyPostApiV1ImportExportImportCsvPreview,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/api/v1/import-export/import/csv/preview",
    }

    _kwargs["files"] = body.to_multipart()

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> CSVPreviewResponse | HTTPValidationError | None:
    if response.status_code == 200:
        response_200 = CSVPreviewResponse.from_dict(response.json())

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
) -> Response[CSVPreviewResponse | HTTPValidationError]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient,
    body: BodyPostApiV1ImportExportImportCsvPreview,
) -> Response[CSVPreviewResponse | HTTPValidationError]:
    """Preview Csv Import

     Preview CSV import: detect columns and show sample rows.

    Returns the detected column mapping and first few rows for user confirmation.

    Args:
        body (BodyPostApiV1ImportExportImportCsvPreview):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[CSVPreviewResponse | HTTPValidationError]
    """

    kwargs = _get_kwargs(
        body=body,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient,
    body: BodyPostApiV1ImportExportImportCsvPreview,
) -> CSVPreviewResponse | HTTPValidationError | None:
    """Preview Csv Import

     Preview CSV import: detect columns and show sample rows.

    Returns the detected column mapping and first few rows for user confirmation.

    Args:
        body (BodyPostApiV1ImportExportImportCsvPreview):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        CSVPreviewResponse | HTTPValidationError
    """

    return sync_detailed(
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient,
    body: BodyPostApiV1ImportExportImportCsvPreview,
) -> Response[CSVPreviewResponse | HTTPValidationError]:
    """Preview Csv Import

     Preview CSV import: detect columns and show sample rows.

    Returns the detected column mapping and first few rows for user confirmation.

    Args:
        body (BodyPostApiV1ImportExportImportCsvPreview):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[CSVPreviewResponse | HTTPValidationError]
    """

    kwargs = _get_kwargs(
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient,
    body: BodyPostApiV1ImportExportImportCsvPreview,
) -> CSVPreviewResponse | HTTPValidationError | None:
    """Preview Csv Import

     Preview CSV import: detect columns and show sample rows.

    Returns the detected column mapping and first few rows for user confirmation.

    Args:
        body (BodyPostApiV1ImportExportImportCsvPreview):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        CSVPreviewResponse | HTTPValidationError
    """

    return (
        await asyncio_detailed(
            client=client,
            body=body,
        )
    ).parsed
