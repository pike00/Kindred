"""Tests for transcribe endpoint (POST /api/v1/transcribe/)."""

from unittest.mock import AsyncMock, patch

import httpx
from fastapi.testclient import TestClient


class TestTranscribeAudio:
    """Tests for POST /api/v1/transcribe/."""

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
            json={"text": "Hello world transcription", "language": "en", "duration": 2.5},
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

