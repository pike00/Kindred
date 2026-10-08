"""Tests for transcribe endpoint (POST /api/v1/transcribe/)."""

from unittest.mock import AsyncMock, patch
from uuid import uuid4

import httpx
from fastapi.testclient import TestClient


class TestTranscribeAudio:
    """Tests for POST /api/v1/transcribe/."""

    def test_openapi_declares_binary_upload(self, client: TestClient):
        document = client.app.openapi()
        body = document["paths"]["/api/v1/transcribe/"]["post"]["requestBody"]
        reference = body["content"]["multipart/form-data"]["schema"]["$ref"]
        schema = document["components"]["schemas"][reference.rsplit("/", 1)[-1]]
        assert schema["properties"]["file"]["format"] == "binary"

    def test_transcribe_unauthorized(self, client: TestClient):
        """Unauthenticated requests must be rejected with 401."""
        response = client.post(
            "/api/v1/transcribe/",
            files={"file": ("test.webm", b"audio-data", "audio/webm")},
        )
        assert response.status_code == 401

    def test_transcribe_empty_file(self, client: TestClient, user_headers: dict):
        """Empty audio uploads return 400."""
        response = client.post(
            "/api/v1/transcribe/",
            files={"file": ("test.webm", b"", "audio/webm")},
            headers=user_headers,
        )
        assert response.status_code == 400
        assert response.json()["detail"] == "Empty file"

    def test_transcribe_success(self, client: TestClient, user_headers: dict):
        """Valid audio upload forwards to Whisper and returns transcribed text."""
        mock_response = httpx.Response(
            status_code=200,
            json={
                "text": "Hello world transcription",
                "language": "en",
                "duration": 2.5,
            },
            request=httpx.Request("POST", "http://whisper:8000/transcribe"),
        )

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_response

            response = client.post(
                "/api/v1/transcribe/",
                files={"file": ("recording.webm", b"mock-audio-bytes", "audio/webm")},
                headers=user_headers,
            )

            assert response.status_code == 200
            data = response.json()
            assert data["text"] == "Hello world transcription"
            assert data["language"] == "en"
            assert data["duration"] == 2.5
            assert data["capture_id"]

    def test_transcribe_whisper_unavailable(
        self, client: TestClient, user_headers: dict
    ):
        """When Whisper service cannot be reached, returns 503."""
        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.side_effect = httpx.ConnectError("Connection refused")

            response = client.post(
                "/api/v1/transcribe/",
                files={"file": ("recording.webm", b"mock-audio-bytes", "audio/webm")},
                headers=user_headers,
            )

            assert response.status_code == 503
            assert "unavailable" in response.json()["detail"].lower()

    def test_invalid_whisper_metadata_does_not_persist_capture(
        self, client: TestClient, user_headers: dict
    ):
        mock_response = httpx.Response(
            status_code=200,
            json={"text": "Hello Nora", "language": 42, "duration": "invalid"},
            request=httpx.Request("POST", "http://whisper:8000/transcribe"),
        )

        with (
            patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post,
            patch("app.api.routes.transcribe.create_capture") as mock_create_capture,
        ):
            mock_post.return_value = mock_response
            response = client.post(
                "/api/v1/transcribe/",
                files={"file": ("recording.webm", b"mock-audio-bytes", "audio/webm")},
                headers=user_headers,
            )

        assert response.status_code == 502
        mock_create_capture.assert_not_called()

    def test_transcribe_uses_only_visible_contact_name_hints(
        self, client: TestClient, user_headers: dict
    ):
        contact = client.post(
            "/api/v1/contacts/",
            headers=user_headers,
            json={"first_name": "Nora", "last_name": "Taylor", "nickname": "Nori"},
        ).json()
        mock_response = httpx.Response(
            status_code=200,
            json={"text": "Call Nora", "language": "en", "duration": 1.0},
            request=httpx.Request("POST", "http://whisper:8000/transcribe"),
        )

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_response
            response = client.post(
                "/api/v1/transcribe/",
                files={"file": ("recording.webm", b"mock-audio-bytes", "audio/webm")},
                data={
                    "contact_ids": [str(contact["id"]), str(uuid4())],
                },
                headers=user_headers,
            )

        assert response.status_code == 200
        request_data = mock_post.call_args.kwargs["data"]
        assert request_data == {
            "initial_prompt": "Contact name hints: Nora Taylor, Nori"
        }
