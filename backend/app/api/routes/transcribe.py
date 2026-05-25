"""Transcription routes.

Proxies audio files to the Whisper service for voice-to-text conversion.
The Whisper service runs in a separate container and is accessed via Docker networking.
"""

import logging
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException, UploadFile

from app.api.deps import CurrentUser

router = APIRouter(prefix="/transcribe", tags=["transcribe"])

logger = logging.getLogger(__name__)

# Internal Whisper service URL (Docker network)
# The service name "whisper" resolves via Docker DNS
WHISPER_URL = "http://whisper:8000/transcribe"


@router.post("/")
async def transcribe_audio(
    *,
    _current_user: CurrentUser,  # noqa: ARG001 (kept for auth)
    file: UploadFile,
) -> Any:
    """
    Transcribe an audio file using the Whisper service.

    Accepts WAV, MP3, or any audio format supported by ffmpeg.
    Returns the transcribed text for review before saving as an Interaction.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    # Read the uploaded file
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")

    # Forward to Whisper service
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            logger.info(f"Forwarding audio file '{file.filename}' to Whisper service")
            response = await client.post(
                WHISPER_URL,
                files={
                    "file": (file.filename, content, file.content_type or "audio/wav")
                },
            )
            response.raise_for_status()
            result = response.json()
            logger.info(
                f"Transcription successful: {len(result.get('text', ''))} characters"
            )
            return result

    except httpx.ConnectError as e:
        logger.error(f"Cannot connect to Whisper service at {WHISPER_URL}: {e}")
        raise HTTPException(
            status_code=503,
            detail="Transcription service unavailable. Please try again later.",
        ) from e

    except httpx.HTTPStatusError as e:
        logger.error(
            f"Whisper service error: {e.response.status_code} - {e.response.text}"
        )
        raise HTTPException(
            status_code=500,
            detail=f"Transcription failed: {e.response.text}",
        ) from e

    except Exception as e:
        logger.error(f"Transcription error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Transcription failed. Please try again.",
        ) from e
