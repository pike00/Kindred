import uuid
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import Session, func, select

from app.api.deps import CurrentUser, SessionDep
from app.core.config import settings
from app.models import VoiceCapture
from app.voice_capture.analysis import LLMConfig
from app.voice_capture.schemas import (
    AnalyzeCapture,
    CreateCapture,
    ReviewCapture,
    VoiceCapturePublic,
    VoiceCapturesPublic,
)
from app.voice_capture.service import (
    analyze_capture,
    commit_review,
    create_capture,
    delete_capture,
    public_capture,
    save_review,
)

router = APIRouter(prefix="/voice-captures", tags=["voice-captures"])


def _owned(
    session: Session, capture_id: uuid.UUID, owner_id: uuid.UUID
) -> VoiceCapture:
    capture = session.exec(
        select(VoiceCapture).where(
            VoiceCapture.id == capture_id, VoiceCapture.owner_id == owner_id
        )
    ).first()
    if capture is None:
        raise HTTPException(404, "Voice capture not found")
    return capture


def _llm_config() -> LLMConfig:
    return LLMConfig(
        base_url=settings.VOICE_LLM_BASE_URL,
        model=settings.VOICE_LLM_MODEL,
        api_key=settings.VOICE_LLM_API_KEY,
        timeout_seconds=settings.VOICE_LLM_TIMEOUT_SECONDS,
    )


@router.post("/", response_model=VoiceCapturePublic, status_code=201)
def create_voice_capture(
    body: CreateCapture, session: SessionDep, current_user: CurrentUser
) -> VoiceCapturePublic:
    return public_capture(
        create_capture(session, current_user.id, body.raw_text, body.timezone)
    )


@router.get("/", response_model=VoiceCapturesPublic)
def list_voice_captures(
    session: SessionDep,
    current_user: CurrentUser,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> VoiceCapturesPublic:
    base = select(VoiceCapture).where(VoiceCapture.owner_id == current_user.id)
    count = session.exec(select(func.count()).select_from(base.subquery())).one()
    rows = session.exec(
        base.order_by(VoiceCapture.created_at.desc()).offset(skip).limit(limit)
    ).all()
    return VoiceCapturesPublic(data=[public_capture(row) for row in rows], count=count)


@router.get("/{capture_id}", response_model=VoiceCapturePublic)
def get_voice_capture(
    capture_id: uuid.UUID, session: SessionDep, current_user: CurrentUser
) -> VoiceCapturePublic:
    return public_capture(_owned(session, capture_id, current_user.id))


@router.post("/{capture_id}/analyze", response_model=VoiceCapturePublic)
async def analyze_voice_capture(
    capture_id: uuid.UUID,
    body: AnalyzeCapture,
    session: SessionDep,
    current_user: CurrentUser,
) -> VoiceCapturePublic:
    capture = _owned(session, capture_id, current_user.id)
    result = await analyze_capture(
        session, capture, current_user, body.revision, body.text, _llm_config()
    )
    return public_capture(result)


@router.put("/{capture_id}", response_model=VoiceCapturePublic)
def update_voice_capture(
    capture_id: uuid.UUID,
    body: ReviewCapture,
    session: SessionDep,
    current_user: CurrentUser,
) -> VoiceCapturePublic:
    capture = _owned(session, capture_id, current_user.id)
    return public_capture(save_review(session, capture, current_user.id, body))


@router.post("/{capture_id}/commit", response_model=VoiceCapturePublic)
def commit_voice_capture(
    capture_id: uuid.UUID,
    body: ReviewCapture,
    session: SessionDep,
    current_user: CurrentUser,
) -> VoiceCapturePublic:
    return public_capture(commit_review(session, capture_id, current_user.id, body))


@router.delete("/{capture_id}", status_code=204)
def delete_voice_capture(
    capture_id: uuid.UUID, session: SessionDep, current_user: CurrentUser
) -> None:
    delete_capture(session, capture_id, current_user.id)
