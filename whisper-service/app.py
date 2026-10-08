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
from starlette.formparsers import MultiPartException

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MAX_UPLOAD_LIMIT_BYTES = 50 * 1024 * 1024
MULTIPART_OVERHEAD_LIMIT_BYTES = 64 * 1024


class RequestBodyTooLarge(MultiPartException):
    """Raised when a transcription request exceeds its bounded body size."""


class RequestBodyLimitMiddleware:
    """Reject oversized ASGI request bodies before multipart parsing can spool them."""

    def __init__(self, app: Any, max_bytes: int):
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope: dict[str, Any], receive: Any, send: Any) -> None:
        if (
            scope["type"] != "http"
            or scope["method"] != "POST"
            or scope["path"] != "/transcribe"
        ):
            await self.app(scope, receive, send)
            return

        content_length = next(
            (
                value
                for name, value in scope.get("headers", [])
                if name.lower() == b"content-length"
            ),
            None,
        )
        if content_length is not None:
            try:
                if int(content_length) > self.max_bytes:
                    await self._reject(send)
                    return
            except ValueError:
                pass

        received_bytes = 0
        overflowed = False
        rejection_body_sent = False
        rejection_body = b'{"detail":"Request body exceeds upload limit"}'

        async def limited_receive() -> dict[str, Any]:
            nonlocal overflowed, received_bytes
            message = await receive()
            if message["type"] == "http.request":
                received_bytes += len(message.get("body", b""))
                if received_bytes > self.max_bytes:
                    overflowed = True
                    raise RequestBodyTooLarge("Request body exceeds upload limit")
            return message

        async def limited_send(message: dict[str, Any]) -> None:
            nonlocal rejection_body_sent
            if not overflowed:
                await send(message)
                return
            if message["type"] == "http.response.start":
                headers = [
                    (name, value)
                    for name, value in message.get("headers", [])
                    if name.lower() not in {b"content-length", b"content-type"}
                ]
                headers.extend(
                    [
                        (b"content-type", b"application/json"),
                        (b"content-length", str(len(rejection_body)).encode("ascii")),
                    ]
                )
                await send({**message, "status": 413, "headers": headers})
            elif message["type"] == "http.response.body" and not rejection_body_sent:
                rejection_body_sent = True
                await send({**message, "body": rejection_body, "more_body": False})

        try:
            await self.app(scope, limited_receive, limited_send)
        except RequestBodyTooLarge:
            await self._reject(send)

    async def _reject(self, send: Any) -> None:
        body = b'{"detail":"Request body exceeds upload limit"}'
        await send(
            {
                "type": "http.response.start",
                "status": 413,
                "headers": [
                    (b"content-type", b"application/json"),
                    (b"content-length", str(len(body)).encode("ascii")),
                ],
            }
        )
        await send({"type": "http.response.body", "body": body})


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
    upload_limit_bytes: int = Field(
        default=25 * 1024 * 1024, gt=0, le=MAX_UPLOAD_LIMIT_BYTES
    )
    prompt_limit_chars: int = Field(default=500, gt=0, le=4000)

    @property
    def request_body_limit_bytes(self) -> int:
        return (
            self.upload_limit_bytes
            + self.prompt_limit_chars
            + MULTIPART_OVERHEAD_LIMIT_BYTES
        )


def load_model(
    model: str, device: str, compute_type: str, model_cache_path: Path
) -> WhisperModel:
    """Load the configured model from the local cache or model registry."""
    return WhisperModel(
        model,
        device=device,
        compute_type=compute_type,
        download_root=str(model_cache_path),
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
    model_loader: Callable[[str, str, str, Path], Any] | None = None,
) -> FastAPI:
    """Create an app with an injectable loader so tests never download models."""
    config = settings or Settings()
    loader = model_loader if model_loader is not None else load_model

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.model = loader(
            config.model,
            config.device,
            config.compute_type,
            config.model_cache_path,
        )
        app.state.loaded_model = config.model
        try:
            yield
        finally:
            app.state.model = None
            app.state.loaded_model = None

    app = FastAPI(title="Whisper Transcription Service", lifespan=lifespan)
    app.add_middleware(
        RequestBodyLimitMiddleware,
        max_bytes=config.request_body_limit_bytes,
    )

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
