"""Configurable faster-whisper transcription service."""

import logging
import tempfile
from collections.abc import Callable
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated, Any

import uvicorn
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from faster_whisper import WhisperModel
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from starlette.concurrency import run_in_threadpool

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    """Runtime configuration for the ASR process."""

    model_config = SettingsConfigDict(
        env_prefix="WHISPER_",
        env_parse_none_str="",
        case_sensitive=False,
        extra="ignore",
    )

    model: str = "base.en"
    device: str = "cpu"
    compute_type: str = "int8"
    model_cache_path: Path = Path("/models")
    beam_size: int = Field(default=5, ge=1, le=10)
    language: str | None = "en"
    upload_limit_bytes: int = Field(default=25 * 1024 * 1024, gt=0)
    prompt_limit_chars: int = Field(default=500, gt=0, le=4000)


def load_model(settings: Settings) -> WhisperModel:
    """Load the configured model from the local cache or model registry."""
    return WhisperModel(
        settings.model,
        device=settings.device,
        compute_type=settings.compute_type,
        download_root=str(settings.model_cache_path),
    )


def _run_transcription(
    model: Any, audio_path: str, *, language: str | None, beam_size: int, initial_prompt: str | None
) -> dict[str, Any]:
    segments, info = model.transcribe(
        audio_path,
        beam_size=beam_size,
        language=language,
        initial_prompt=initial_prompt,
        vad_filter=True,
    )
    segment_data = [
        {
            "start": segment.start,
            "end": segment.end,
            "text": segment.text,
            "avg_logprob": segment.avg_logprob,
            "no_speech_prob": segment.no_speech_prob,
        }
        for segment in segments
    ]
    return {
        "text": " ".join(segment["text"].strip() for segment in segment_data),
        "language": info.language,
        "duration": info.duration,
        "segments": segment_data,
    }


def create_app(
    settings: Settings | None = None,
    model_loader: Callable[[Settings], Any] | None = None,
) -> FastAPI:
    """Create an app with an injectable loader so tests never download models."""
    config = settings or Settings()
    loader = model_loader or load_model

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.model = loader(config)
        app.state.loaded_model = config.model
        try:
            yield
        finally:
            app.state.model = None
            app.state.loaded_model = None

    app = FastAPI(title="Whisper Transcription Service", lifespan=lifespan)

    @app.get("/health")
    async def health_check() -> dict[str, str | None]:
        loaded_model = getattr(app.state, "loaded_model", None)
        return {
            "status": "ok" if loaded_model else "starting",
            "configured_model": config.model,
            "loaded_model": loaded_model,
            "device": config.device,
            "compute_type": config.compute_type,
        }

    @app.post("/transcribe")
    async def transcribe_audio(
        file: Annotated[UploadFile, File(...)],
        initial_prompt: Annotated[
            str | None, Form(max_length=config.prompt_limit_chars)
        ] = None,
    ) -> dict[str, Any]:
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")

        content = await file.read(config.upload_limit_bytes + 1)
        if not content:
            raise HTTPException(status_code=400, detail="Audio file is empty")
        if len(content) > config.upload_limit_bytes:
            raise HTTPException(status_code=413, detail="Audio file exceeds upload limit")

        temp_path: str | None = None
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".audio") as temp_file:
                temp_path = temp_file.name
                temp_file.write(content)

            result = await run_in_threadpool(
                _run_transcription,
                app.state.model,
                temp_path,
                language=config.language,
                beam_size=config.beam_size,
                initial_prompt=initial_prompt,
            )
            logger.info("Transcription complete: %s characters", len(result["text"]))
            return result
        except Exception as exc:
            logger.exception("Transcription failed")
            raise HTTPException(status_code=500, detail="Transcription failed") from exc
        finally:
            if temp_path is not None:
                Path(temp_path).unlink(missing_ok=True)

    return app


app = create_app()


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
