import asyncio
import wave
from contextlib import asynccontextmanager
from pathlib import Path
from types import SimpleNamespace

import httpx
import pytest
from faster_whisper.audio import decode_audio

import app as service
from app import Settings, create_app


class FakeModel:
    def __init__(self, *, fail=False, delay=0):
        self.fail = fail
        self.delay = delay
        self.options = None
        self.audio_path = None

    def transcribe(self, audio_path, **options):
        self.audio_path = audio_path
        self.options = options
        if self.delay:
            import time

            time.sleep(self.delay)
        if self.fail:
            raise RuntimeError("decoder failed")
        return iter(
            [
                SimpleNamespace(
                    start=0.25,
                    end=1.75,
                    text=" Nora Taylor prefers tea.",
                    avg_logprob=-0.17,
                    no_speech_prob=0.02,
                )
            ]
        ), SimpleNamespace(language="en", duration=2.1)


@asynccontextmanager
async def async_client(app):
    async with app.router.lifespan_context(app), httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        yield client


def test_settings_are_typed_configurable_and_allow_language_detection(monkeypatch):
    monkeypatch.setenv("WHISPER_MODEL", "small.en")
    monkeypatch.setenv("WHISPER_DEVICE", "cpu")
    monkeypatch.setenv("WHISPER_COMPUTE_TYPE", "int8")
    monkeypatch.setenv("WHISPER_LANGUAGE", "")
    monkeypatch.setenv("WHISPER_BEAM_SIZE", "3")

    settings = Settings(_env_file=None)

    assert settings.model == "small.en"
    assert settings.device == "cpu"
    assert settings.compute_type == "int8"
    assert settings.language is None
    assert settings.beam_size == 3
    assert settings.upload_limit_bytes > 0
    assert settings.prompt_limit_chars > 0


def test_model_loader_uses_all_model_runtime_settings(monkeypatch, tmp_path):
    calls = []
    monkeypatch.setattr(
        service,
        "WhisperModel",
        lambda *args, **kwargs: calls.append((args, kwargs)) or "model",
    )
    settings = Settings(
        _env_file=None,
        model="small.en",
        device="cpu",
        compute_type="int8_float32",
        model_cache_path=tmp_path,
    )

    assert service.load_model(
        settings.model,
        settings.device,
        settings.compute_type,
        settings.model_cache_path,
    ) == "model"
    assert calls == [
        (
            ("small.en",),
            {
                "device": "cpu",
                "compute_type": "int8_float32",
                "download_root": str(tmp_path),
            },
        )
    ]


def test_model_loads_in_lifespan_and_health_reports_configured_and_loaded_model():
    settings = Settings(_env_file=None, model="base.en", model_cache_path="/models")
    model = FakeModel()
    called = []
    app = create_app(settings, lambda *args: called.append(args) or model)

    async def request_health():
        async with async_client(app) as client:
            return await client.get("/health")

    response = asyncio.run(request_health())

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "configured_model": "base.en",
        "loaded_model": "base.en",
        "device": "cpu",
        "compute_type": "int8",
    }
    assert called == [("base.en", "cpu", "int8", Path("/models"))]


def test_falsey_injected_loader_is_used(monkeypatch):
    model = FakeModel()

    class FalseyLoader:
        def __bool__(self):
            return False

        def __call__(self, *_args):
            return model

    monkeypatch.setattr(
        service, "load_model", lambda *_args: pytest.fail("default loader was used")
    )
    app = create_app(Settings(_env_file=None), FalseyLoader())

    async def request_health():
        async with async_client(app) as client:
            return await client.get("/health")

    response = asyncio.run(request_health())

    assert response.status_code == 200
    assert response.json()["loaded_model"] == "base.en"


def test_transcription_propagates_prompt_and_returns_segment_metadata(tmp_path, monkeypatch):
    monkeypatch.setattr("tempfile.tempdir", str(tmp_path))
    settings = Settings(_env_file=None, prompt_limit_chars=80)
    model = FakeModel()
    app = create_app(settings, lambda *_args: model)

    async def request():
        async with async_client(app) as client:
            return await client.post(
                "/transcribe",
                files={"file": ("sample.wav", b"synthetic-audio", "audio/wav")},
                data={"initial_prompt": "Nora Taylor, Lucas Maeda"},
            )

    response = asyncio.run(request())

    assert response.status_code == 200
    assert response.json() == {
        "text": "Nora Taylor prefers tea.",
        "language": "en",
        "duration": 2.1,
        "segments": [
            {
                "start": 0.25,
                "end": 1.75,
                "text": " Nora Taylor prefers tea.",
                "avg_logprob": -0.17,
                "no_speech_prob": 0.02,
            }
        ],
    }
    assert model.options["initial_prompt"] == "Nora Taylor, Lucas Maeda"
    assert model.options["beam_size"] == settings.beam_size
    assert not list(tmp_path.iterdir())


def test_oversized_initial_prompt_is_rejected():
    app = create_app(Settings(_env_file=None, prompt_limit_chars=4), lambda *_args: FakeModel())

    async def request():
        async with async_client(app) as client:
            return await client.post(
                "/transcribe",
                files={"file": ("sample.wav", b"audio", "audio/wav")},
                data={"initial_prompt": "too long"},
            )

    response = asyncio.run(request())

    assert response.status_code == 422


def test_language_can_be_configured_for_non_english_transcription():
    model = FakeModel()
    app = create_app(Settings(_env_file=None, language="es"), lambda *_args: model)

    async def request():
        async with async_client(app) as client:
            return await client.post(
                "/transcribe", files={"file": ("sample.wav", b"audio", "audio/wav")}
            )

    response = asyncio.run(request())

    assert response.status_code == 200
    assert model.options["language"] == "es"
    assert model.options["initial_prompt"] is None


def test_language_detection_is_passed_as_none():
    model = FakeModel()
    app = create_app(Settings(_env_file=None, language=None), lambda *_args: model)

    async def request():
        async with async_client(app) as client:
            return await client.post(
                "/transcribe", files={"file": ("sample.wav", b"audio", "audio/wav")}
            )

    response = asyncio.run(request())

    assert response.status_code == 200
    assert model.options["language"] is None


def test_empty_audio_is_rejected():
    model = FakeModel()
    app = create_app(Settings(_env_file=None), lambda *_args: model)

    async def request():
        async with async_client(app) as client:
            return await client.post(
                "/transcribe", files={"file": ("empty.wav", b"", "audio/wav")}
            )

    response = asyncio.run(request())

    assert response.status_code == 400
    assert model.options is None


def test_oversized_audio_is_rejected_before_temp_file_creation(tmp_path, monkeypatch):
    monkeypatch.setattr("tempfile.tempdir", str(tmp_path))
    settings = Settings(_env_file=None, upload_limit_bytes=4)
    app = create_app(settings, lambda *_args: FakeModel())

    async def request():
        async with async_client(app) as client:
            return await client.post(
                "/transcribe", files={"file": ("large.wav", b"12345", "audio/wav")}
            )

    response = asyncio.run(request())

    assert response.status_code == 413
    assert not list(tmp_path.iterdir())


def test_decoder_failure_returns_error_and_removes_temp_file(tmp_path, monkeypatch):
    monkeypatch.setattr("tempfile.tempdir", str(tmp_path))
    app = create_app(Settings(_env_file=None), lambda *_args: FakeModel(fail=True))

    async def request():
        async with async_client(app) as client:
            return await client.post(
                "/transcribe", files={"file": ("sample.wav", b"audio", "audio/wav")}
            )

    response = asyncio.run(request())

    assert response.status_code == 500
    assert response.json()["detail"] == "Transcription failed"
    assert not list(tmp_path.iterdir())


def test_inference_does_not_block_the_event_loop():
    model = FakeModel(delay=0.25)
    app = create_app(Settings(_env_file=None), lambda *_args: model)

    async def exercise():
        async with async_client(app) as client:
            request = asyncio.create_task(
                client.post(
                    "/transcribe",
                    files={"file": ("sample.wav", b"audio", "audio/wav")},
                )
            )
            await asyncio.sleep(0.05)
            loop_progressed = not request.done()
            response = await request
            return loop_progressed, response

    progressed, response = asyncio.run(exercise())

    assert progressed
    assert response.status_code == 200


def test_initial_prompt_limit_is_validated():
    with pytest.raises(ValueError):
        Settings(_env_file=None, prompt_limit_chars=0)


def test_upload_limit_has_a_configured_upper_bound():
    with pytest.raises(ValueError):
        Settings(_env_file=None, upload_limit_bytes=50 * 1024 * 1024 + 1)


def test_pinned_pyav_decodes_generated_wav_with_faster_whisper(tmp_path):
    audio_path = tmp_path / "generated.wav"
    with wave.open(str(audio_path), "wb") as audio_file:
        audio_file.setnchannels(1)
        audio_file.setsampwidth(2)
        audio_file.setframerate(16_000)
        audio_file.writeframes(bytes(16_000 // 4 * 2))

    audio = decode_audio(str(audio_path))

    assert audio.shape == (4_000,)
    assert audio.dtype.name == "float32"
    assert float(audio.max()) == 0.0


def test_oversized_multipart_content_length_is_rejected_before_parsing(tmp_path, monkeypatch):
    monkeypatch.setattr("tempfile.tempdir", str(tmp_path))
    settings = Settings(_env_file=None, upload_limit_bytes=4, prompt_limit_chars=4)
    model = FakeModel()
    app = create_app(settings, lambda *_args: model)
    request_limit = settings.upload_limit_bytes + settings.prompt_limit_chars + 64 * 1024

    async def request():
        async with async_client(app) as client:
            response = await client.post(
                "/transcribe",
                content=b"x" * (request_limit + 1),
                headers={"Content-Type": "multipart/form-data; boundary=broken"},
            )
            health = await client.get("/health")
            return response, health

    response, health = asyncio.run(request())

    assert response.status_code == 413
    assert model.options is None
    assert health.status_code == 200
    assert health.json()["loaded_model"] == "base.en"
    assert not list(tmp_path.iterdir())


def test_chunked_oversized_multipart_is_rejected_and_parser_tempfiles_are_cleaned(
    tmp_path, monkeypatch
):
    monkeypatch.setattr("tempfile.tempdir", str(tmp_path))
    settings = Settings(_env_file=None, upload_limit_bytes=1024 * 1024, prompt_limit_chars=4)
    model = FakeModel()
    app = create_app(settings, lambda *_args: model)
    boundary = "asr-size-boundary"
    request_limit = settings.upload_limit_bytes + settings.prompt_limit_chars + 64 * 1024
    header = (
        f"--{boundary}\r\n"
        'Content-Disposition: form-data; name="file"; filename="large.wav"\r\n'
        "Content-Type: audio/wav\r\n\r\n"
    ).encode()
    trailer = f"\r\n--{boundary}--\r\n".encode()

    async def chunks():
        nonlocal chunks_yielded
        chunks_yielded += 1
        yield header
        remaining = request_limit + 512 * 1024
        while remaining:
            chunk = b"x" * min(32 * 1024, remaining)
            remaining -= len(chunk)
            chunks_yielded += 1
            yield chunk
        chunks_yielded += 1
        yield trailer

    chunks_yielded = 0
    total_chunks = 1 + (request_limit + 512 * 1024 + 32 * 1024 - 1) // (32 * 1024) + 1

    async def request():
        async with async_client(app) as client:
            request = client.build_request(
                "POST",
                "/transcribe",
                content=chunks(),
                headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
            )
            assert "content-length" not in request.headers
            response = await client.send(request)
            health = await client.get("/health")
            return response, health

    response, health = asyncio.run(request())

    assert response.status_code == 413
    assert chunks_yielded < total_chunks
    assert model.options is None
    assert health.status_code == 200
    assert health.json()["loaded_model"] == "base.en"
    assert not list(tmp_path.iterdir())
