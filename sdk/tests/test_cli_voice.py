"""Voice CLI tests exercise wire payloads and error handling, without a server."""

import json
from uuid import UUID

import httpx
import pytest
from typer.testing import CliRunner

from kindred.cli import app

BASE = "https://kindred.example.com"
CAPTURE_ID = UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")
CONTACT_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
NOW = "2026-10-07T15:00:00-05:00"
RAW = "Nora prefers tea. Her birthday is May 10."
runner = CliRunner()


@pytest.fixture(autouse=True)
def credentials(monkeypatch):
    monkeypatch.setenv("KINDRED_BASE_URL", BASE)
    monkeypatch.setenv("KINDRED_API_KEY", "test-key")
    monkeypatch.delenv("KINDRED_ON_BEHALF_OF", raising=False)


def capture(**changes):
    result = {
        "id": str(CAPTURE_ID),
        "raw_text": RAW,
        "corrected_text": RAW,
        "timezone": "America/Chicago",
        "recorded_at": NOW,
        "created_at": NOW,
        "updated_at": NOW,
        "status": "draft",
        "revision": 1,
        "actions": [],
        "warnings": [],
        "analysis_error": None,
        "committed_at": None,
        "results": None,
    }
    return result | changes


def review():
    return {
        "revision": 3,
        "corrected_text": RAW,
        "actions": [
            {
                "id": "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
                "kind": "contact_update",
                "enabled": True,
                "evidence": "Her birthday is May 10.",
                "review_warning": None,
                "contact_id": CONTACT_ID,
                "fields": [{"field": "birthday", "value": "1990-05-10"}, {"field": "company", "value": None}],
            }
        ],
    }


def test_create_preserves_stdin_and_timezone(httpx_mock):
    httpx_mock.add_response(
        method="POST",
        url=f"{BASE}/api/v1/voice-captures/",
        status_code=201,
        json=capture(raw_text=RAW + "\n"),
    )
    result = runner.invoke(
        app, ["voice", "create", "--file", "-", "--timezone", "America/Chicago"], input=RAW + "\n"
    )
    assert result.exit_code == 0, result.output
    assert json.loads(httpx_mock.get_request().content) == {
        "raw_text": RAW + "\n",
        "timezone": "America/Chicago",
    }


def test_list_paginates_and_get_resumes(httpx_mock):
    httpx_mock.add_response(
        method="GET",
        url=f"{BASE}/api/v1/voice-captures/?skip=100&limit=20",
        json={"data": [capture()], "count": 101},
    )
    result = runner.invoke(app, ["voice", "list", "--skip", "100", "--limit", "20"])
    assert result.exit_code == 0, result.output
    assert json.loads(result.output)["id"] == str(CAPTURE_ID)
    httpx_mock.add_response(method="GET", url=f"{BASE}/api/v1/voice-captures/{CAPTURE_ID}", json=capture())
    result = runner.invoke(app, ["voice", "get", str(CAPTURE_ID)])
    assert result.exit_code == 0, result.output
    assert json.loads(result.output)["raw_text"] == RAW


def test_analyze_sends_edited_text_and_extended_timeout(httpx_mock):
    httpx_mock.add_response(
        method="POST",
        url=f"{BASE}/api/v1/voice-captures/{CAPTURE_ID}/analyze",
        json=capture(status="ready", revision=2),
    )
    result = runner.invoke(
        app,
        ["voice", "analyze", str(CAPTURE_ID), "--revision", "1", "--file", "-"],
        input="Nora prefers green tea.",
    )
    assert result.exit_code == 0, result.output
    request = httpx_mock.get_request()
    assert json.loads(request.content) == {"revision": 1, "text": "Nora prefers green tea."}
    assert request.extensions["timeout"]["read"] >= 120


@pytest.mark.parametrize(
    ("command", "method", "suffix"), [("update", "PUT", ""), ("commit", "POST", "/commit")]
)
def test_review_payload_keeps_action_ids_nulls_and_dates(httpx_mock, command, method, suffix):
    httpx_mock.add_response(
        method=method, url=f"{BASE}/api/v1/voice-captures/{CAPTURE_ID}{suffix}", json=capture(revision=4)
    )
    result = runner.invoke(
        app, ["voice", command, str(CAPTURE_ID), "--file", "-"], input=json.dumps(review())
    )
    assert result.exit_code == 0, result.output
    assert json.loads(httpx_mock.get_request().content) == review()


@pytest.mark.parametrize("body", ["{", "[]", '{"revision": 1}'])
def test_invalid_review_is_rejected_without_request(body):
    result = runner.invoke(app, ["voice", "commit", str(CAPTURE_ID), "--file", "-"], input=body)
    assert result.exit_code != 0
    assert "review" in result.output.lower()
    assert "Traceback" not in result.output


@pytest.mark.parametrize("status", [409, 422])
def test_server_rejection_has_failure_exit(httpx_mock, status):
    detail = (
        "Capture changed"
        if status == 409
        else [{"loc": ["body", "revision"], "msg": "invalid", "type": "value_error"}]
    )
    httpx_mock.add_response(
        method="POST",
        url=f"{BASE}/api/v1/voice-captures/{CAPTURE_ID}/commit",
        status_code=status,
        json={"detail": detail},
    )
    result = runner.invoke(
        app, ["voice", "commit", str(CAPTURE_ID), "--file", "-"], input=json.dumps(review())
    )
    assert result.exit_code == 1
    assert str(status) in result.output


def test_request_failure_gives_command_neutral_retry_guidance(httpx_mock):
    httpx_mock.add_exception(httpx.ConnectError("offline"))
    result = runner.invoke(app, ["contacts", "list"])

    assert result.exit_code == 1
    assert "completed before retrying" in result.output
    assert "capture" not in result.output.lower()


def test_delete_uncommitted_capture(httpx_mock):
    httpx_mock.add_response(
        method="DELETE", url=f"{BASE}/api/v1/voice-captures/{CAPTURE_ID}", status_code=204
    )
    result = runner.invoke(app, ["voice", "delete", str(CAPTURE_ID)])
    assert result.exit_code == 0, result.output


def test_transcribe_uploads_audio_and_visible_contact_hints(httpx_mock, tmp_path):
    audio = tmp_path / "sample.wav"
    audio.write_bytes(b"synthetic-audio")
    httpx_mock.add_response(
        method="POST",
        url=f"{BASE}/api/v1/transcribe/",
        json={
            "text": RAW,
            "language": "en",
            "duration": 2.0,
            "capture_id": str(CAPTURE_ID),
        },
    )
    result = runner.invoke(
        app, ["voice", "transcribe", str(audio), "--timezone", "America/Chicago", "--contact", CONTACT_ID]
    )
    assert result.exit_code == 0, result.output
    content = httpx_mock.get_request().content
    assert b"synthetic-audio" in content
    assert b"America/Chicago" in content
    assert CONTACT_ID.encode() in content
