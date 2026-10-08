"""Transcription routes.

Proxies audio files to the Whisper service for voice-to-text conversion.
The Whisper service runs in a separate container and is accessed via Docker networking.
"""

import logging
import uuid

import httpx
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import ValidationError
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.core.config import settings
from app.crud import visible_contact_ids
from app.models import Contact
from app.voice_capture.schemas import (
    CreateCapture,
    TranscriptionResponse,
    WhisperTranscription,
)
from app.voice_capture.service import create_capture

router = APIRouter(prefix="/transcribe", tags=["transcribe"])
_MAX_CONTACT_HINTS = 20
_MAX_INITIAL_PROMPT_LENGTH = 500

logger = logging.getLogger(__name__)

# Internal Whisper service URL — configurable via WHISPER_URL (default points
# at the "whisper" service on the Docker network).
WHISPER_URL = f"{settings.WHISPER_URL.rstrip('/')}/transcribe"


def _contact_initial_prompt(
    session: SessionDep, current_user: CurrentUser, contact_ids: list[uuid.UUID]
) -> str | None:
    requested_ids = list(dict.fromkeys(contact_ids))[:_MAX_CONTACT_HINTS]
    if not requested_ids:
        return None
    contacts = session.exec(
        select(Contact).where(
            Contact.id.in_(requested_ids),
            Contact.id.in_(visible_contact_ids(current_user)),
        )
    ).all()
    by_id = {contact.id: contact for contact in contacts}
    names: list[str] = []
    for contact_id in requested_ids:
        contact = by_id.get(contact_id)
        if contact is None:
            continue
        full_name = " ".join(
            part for part in (contact.first_name, contact.last_name) if part
        ).strip()
        for name in (full_name, contact.nickname):
            if name and name not in names:
                names.append(name)
    if not names:
        return None
    prompt = "Contact name hints: "
    permitted_names: list[str] = []
    for name in names:
        candidate = ", ".join((*permitted_names, name))
        if len(prompt) + len(candidate) > _MAX_INITIAL_PROMPT_LENGTH:
            break
        permitted_names.append(name)
    return prompt + ", ".join(permitted_names) if permitted_names else None


@router.post("/", response_model=TranscriptionResponse)
async def transcribe_audio(
    *,
    current_user: CurrentUser,
    session: SessionDep,
    file: UploadFile = File(json_schema_extra={"format": "binary"}),
    timezone: str = Form(default="UTC"),
    contact_ids: list[uuid.UUID] = Form(default=[]),
) -> TranscriptionResponse:
    """
    Transcribe an audio file using the Whisper service.

    Accepts WAV, MP3, or any audio format supported by ffmpeg.
    Returns the original text and a durable capture for reviewing proposed records.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    if len(contact_ids) > _MAX_CONTACT_HINTS:
        raise HTTPException(
            status_code=422,
            detail=f"At most {_MAX_CONTACT_HINTS} contact hints may be provided",
        )

    # Read the uploaded file
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")
    initial_prompt = _contact_initial_prompt(session, current_user, contact_ids)

    # Forward to Whisper service
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            logger.info(f"Forwarding audio file '{file.filename}' to Whisper service")
            response = await client.post(
                WHISPER_URL,
                files={
                    "file": (file.filename, content, file.content_type or "audio/wav")
                },
                data={"initial_prompt": initial_prompt} if initial_prompt else None,
            )
            response.raise_for_status()
            try:
                result = WhisperTranscription.model_validate(response.json())
            except (ValidationError, ValueError, TypeError) as e:
                raise HTTPException(
                    status_code=502,
                    detail="Transcription service returned invalid metadata",
                ) from e
            logger.info(f"Transcription successful: {len(result.text)} characters")
            try:
                request = CreateCapture(raw_text=result.text, timezone=timezone)
            except ValidationError as e:
                raise HTTPException(
                    status_code=422,
                    detail="Invalid timezone",
                ) from e
            capture = create_capture(
                session, current_user.id, request.raw_text, request.timezone
            )
            return TranscriptionResponse(
                text=request.raw_text,
                language=result.language,
                duration=result.duration,
                capture_id=capture.id,
            )

    except HTTPException:
        raise

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
