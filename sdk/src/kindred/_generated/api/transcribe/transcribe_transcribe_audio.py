from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.body_transcribe_transcribe_audio import BodyTranscribeTranscribeAudio
from ...models.http_validation_error import HTTPValidationError
from ...models.transcription_response import TranscriptionResponse
from typing import cast


def _get_kwargs(
    *,
    body: BodyTranscribeTranscribeAudio,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/api/v1/transcribe/",
    }

    _kwargs["files"] = body.to_multipart()

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> HTTPValidationError | TranscriptionResponse | None:
    if response.status_code == 200:
        response_200 = TranscriptionResponse.from_dict(response.json())

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
) -> Response[HTTPValidationError | TranscriptionResponse]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient,
    body: BodyTranscribeTranscribeAudio,
) -> Response[HTTPValidationError | TranscriptionResponse]:
    """Transcribe Audio

     Transcribe an audio file using the Whisper service.

    Accepts WAV, MP3, or any audio format supported by ffmpeg.
    Returns the original text and a durable capture for reviewing proposed records.

    Args:
        body (BodyTranscribeTranscribeAudio):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | TranscriptionResponse]
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
    body: BodyTranscribeTranscribeAudio,
) -> HTTPValidationError | TranscriptionResponse | None:
    """Transcribe Audio

     Transcribe an audio file using the Whisper service.

    Accepts WAV, MP3, or any audio format supported by ffmpeg.
    Returns the original text and a durable capture for reviewing proposed records.

    Args:
        body (BodyTranscribeTranscribeAudio):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | TranscriptionResponse
    """

    return sync_detailed(
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient,
    body: BodyTranscribeTranscribeAudio,
) -> Response[HTTPValidationError | TranscriptionResponse]:
    """Transcribe Audio

     Transcribe an audio file using the Whisper service.

    Accepts WAV, MP3, or any audio format supported by ffmpeg.
    Returns the original text and a durable capture for reviewing proposed records.

    Args:
        body (BodyTranscribeTranscribeAudio):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | TranscriptionResponse]
    """

    kwargs = _get_kwargs(
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient,
    body: BodyTranscribeTranscribeAudio,
) -> HTTPValidationError | TranscriptionResponse | None:
    """Transcribe Audio

     Transcribe an audio file using the Whisper service.

    Accepts WAV, MP3, or any audio format supported by ffmpeg.
    Returns the original text and a durable capture for reviewing proposed records.

    Args:
        body (BodyTranscribeTranscribeAudio):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | TranscriptionResponse
    """

    return (
        await asyncio_detailed(
            client=client,
            body=body,
        )
    ).parsed
