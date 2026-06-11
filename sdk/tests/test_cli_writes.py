"""Tests for the CLI write commands + --on-behalf-of impersonation.

Uses Typer's CliRunner with the HTTP layer mocked via pytest-httpx, matching
the existing pytest-httpx pattern in test_client.py. Each test asserts the
command parses, sends the right method/URL, and serializes the right JSON body.
"""

from __future__ import annotations

import json
import re
import uuid
from datetime import datetime, timezone

import pytest
from pytest_httpx import HTTPXMock
from typer.testing import CliRunner

from kindred.cli import app

BASE = "https://kindred.example.com"
API_KEY = "test-key"

NOW = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

runner = CliRunner()


def _note_resp(**over) -> dict:
    d = {
        "id": str(uuid.uuid4()),
        "body": "x",
        "contact_id": str(uuid.uuid4()),
        "created_at": NOW,
        "updated_at": NOW,
    }
    d.update(over)
    return d


def _interaction_resp(**over) -> dict:
    d = {
        "id": str(uuid.uuid4()),
        "channel": "call",
        "occurred_at": NOW,
        "created_at": NOW,
    }
    d.update(over)
    return d


def _contact_resp(**over) -> dict:
    d = {
        "id": str(uuid.uuid4()),
        "first_name": "Bob",
        "avatar_url": None,
        "last_contacted_at": None,
        "created_at": NOW,
        "updated_at": NOW,
    }
    d.update(over)
    return d


def _reminder_resp(**over) -> dict:
    d = {
        "id": str(uuid.uuid4()),
        "title": "x",
        "remind_at": NOW,
        "contact_id": None,
        "last_sent_at": None,
        "snoozed_until": None,
        "created_at": NOW,
    }
    d.update(over)
    return d


@pytest.fixture(autouse=True)
def _env(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("KINDRED_BASE_URL", BASE)
    monkeypatch.setenv("KINDRED_API_KEY", API_KEY)
    monkeypatch.delenv("KINDRED_ON_BEHALF_OF", raising=False)


def _request_json(httpx_mock: HTTPXMock) -> dict:
    req = httpx_mock.get_request()
    assert req is not None
    return json.loads(req.content)


# ── interactions create ─────────────────────────────────────────────────────


def test_interactions_create_builds_body(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url=re.compile(rf"{re.escape(BASE)}/api/v1/interactions/?"),
        method="POST",
        json=_interaction_resp(),
    )
    a1, a2 = uuid.uuid4(), uuid.uuid4()
    result = runner.invoke(
        app,
        [
            "interactions",
            "create",
            "--attendee",
            str(a1),
            "--attendee",
            str(a2),
            "--channel",
            "call",
            "--occurred-at",
            "2026-01-02T03:04:05+00:00",
            "--notes",
            "caught up",
            "--duration-minutes",
            "30",
        ],
    )
    assert result.exit_code == 0, result.output
    body = _request_json(httpx_mock)
    assert body["channel"] == "call"
    assert body["attendee_ids"] == [str(a1), str(a2)]
    assert body["occurred_at"].startswith("2026-01-02T03:04:05")
    assert body["notes"] == "caught up"
    assert body["duration_minutes"] == 30


def test_interactions_create_now_default(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url=re.compile(rf"{re.escape(BASE)}/api/v1/interactions/?"),
        method="POST",
        json=_interaction_resp(),
    )
    result = runner.invoke(
        app,
        ["interactions", "create", "--attendee", str(uuid.uuid4()), "--channel", "text"],
    )
    assert result.exit_code == 0, result.output
    body = _request_json(httpx_mock)
    assert body["occurred_at"]  # 'now' resolved to a real timestamp


def test_interactions_create_bad_channel_rejected(httpx_mock: HTTPXMock):
    result = runner.invoke(
        app,
        ["interactions", "create", "--attendee", str(uuid.uuid4()), "--channel", "telepathy"],
    )
    assert result.exit_code != 0
    assert "not one of" in result.output


def test_interactions_update_partial(httpx_mock: HTTPXMock):
    iid = uuid.uuid4()
    httpx_mock.add_response(
        url=f"{BASE}/api/v1/interactions/{iid}",
        method="PATCH",
        json=_interaction_resp(id=str(iid)),
    )
    result = runner.invoke(app, ["interactions", "update", str(iid), "--mood", "happy"])
    assert result.exit_code == 0, result.output
    body = _request_json(httpx_mock)
    assert body == {"mood": "happy"}


def test_interactions_delete(httpx_mock: HTTPXMock):
    iid = uuid.uuid4()
    httpx_mock.add_response(
        url=f"{BASE}/api/v1/interactions/{iid}",
        method="DELETE",
        json={"ok": True},
    )
    result = runner.invoke(app, ["interactions", "delete", str(iid)])
    assert result.exit_code == 0, result.output
    assert httpx_mock.get_request().method == "DELETE"


# ── notes ───────────────────────────────────────────────────────────────────


def test_notes_create_builds_body(httpx_mock: HTTPXMock):
    cid = uuid.uuid4()
    httpx_mock.add_response(
        url=re.compile(rf"{re.escape(BASE)}/api/v1/notes/?"),
        method="POST",
        json=_note_resp(),
    )
    result = runner.invoke(
        app, ["notes", "create", "--contact", str(cid), "--body", "remember this"]
    )
    assert result.exit_code == 0, result.output
    body = _request_json(httpx_mock)
    assert body == {"body": "remember this", "contact_id": str(cid)}


def test_notes_update(httpx_mock: HTTPXMock):
    nid = uuid.uuid4()
    httpx_mock.add_response(
        url=f"{BASE}/api/v1/notes/{nid}",
        method="PATCH",
        json=_note_resp(id=str(nid)),
    )
    result = runner.invoke(app, ["notes", "update", str(nid), "--body", "edited"])
    assert result.exit_code == 0, result.output
    assert _request_json(httpx_mock) == {"body": "edited"}


def test_notes_delete(httpx_mock: HTTPXMock):
    nid = uuid.uuid4()
    httpx_mock.add_response(
        url=f"{BASE}/api/v1/notes/{nid}", method="DELETE", json={"ok": True}
    )
    result = runner.invoke(app, ["notes", "delete", str(nid)])
    assert result.exit_code == 0, result.output
    assert httpx_mock.get_request().method == "DELETE"


# ── contacts create ─────────────────────────────────────────────────────────


def test_contacts_create_minimal(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url=re.compile(rf"{re.escape(BASE)}/api/v1/contacts/?"),
        method="POST",
        json=_contact_resp(),
    )
    result = runner.invoke(app, ["contacts", "create", "--first-name", "Bob"])
    assert result.exit_code == 0, result.output
    body = _request_json(httpx_mock)
    assert body["first_name"] == "Bob"
    assert "last_name" not in body  # omitted optionals stay unset


def test_contacts_create_optionals(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url=re.compile(rf"{re.escape(BASE)}/api/v1/contacts/?"),
        method="POST",
        json=_contact_resp(),
    )
    result = runner.invoke(
        app,
        [
            "contacts",
            "create",
            "--first-name",
            "Bob",
            "--last-name",
            "Jones",
            "--company",
            "Acme",
            "--contact-frequency-days",
            "30",
        ],
    )
    assert result.exit_code == 0, result.output
    body = _request_json(httpx_mock)
    assert body["last_name"] == "Jones"
    assert body["company"] == "Acme"
    assert body["contact_frequency_days"] == 30


# ── reminders create ────────────────────────────────────────────────────────


def test_reminders_create(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url=re.compile(rf"{re.escape(BASE)}/api/v1/reminders/?"),
        method="POST",
        json=_reminder_resp(),
    )
    result = runner.invoke(
        app,
        [
            "reminders",
            "create",
            "--title",
            "Call Mom",
            "--remind-at",
            "2026-02-01T09:00:00+00:00",
            "--frequency",
            "weekly",
        ],
    )
    assert result.exit_code == 0, result.output
    body = _request_json(httpx_mock)
    assert body["title"] == "Call Mom"
    assert body["frequency"] == "weekly"
    assert body["remind_at"].startswith("2026-02-01T09:00:00")
    assert body["is_active"] is True


def test_reminders_create_bad_frequency(httpx_mock: HTTPXMock):
    result = runner.invoke(
        app,
        ["reminders", "create", "--title", "x", "--remind-at", "now", "--frequency", "hourly"],
    )
    assert result.exit_code != 0
    assert "not one of" in result.output


# ── --on-behalf-of impersonation header ─────────────────────────────────────


def test_on_behalf_of_flag_sets_header(httpx_mock: HTTPXMock):
    obo = uuid.uuid4()
    cid = uuid.uuid4()
    httpx_mock.add_response(
        url=re.compile(rf"{re.escape(BASE)}/api/v1/notes/?"),
        method="POST",
        json=_note_resp(),
    )
    result = runner.invoke(
        app,
        [
            "--on-behalf-of",
            str(obo),
            "notes",
            "create",
            "--contact",
            str(cid),
            "--body",
            "hi",
        ],
    )
    assert result.exit_code == 0, result.output
    req = httpx_mock.get_request()
    assert req.headers["X-On-Behalf-Of"] == str(obo)


def test_on_behalf_of_env_fallback(httpx_mock: HTTPXMock, monkeypatch: pytest.MonkeyPatch):
    obo = uuid.uuid4()
    cid = uuid.uuid4()
    monkeypatch.setenv("KINDRED_ON_BEHALF_OF", str(obo))
    httpx_mock.add_response(
        url=re.compile(rf"{re.escape(BASE)}/api/v1/notes/?"),
        method="POST",
        json=_note_resp(),
    )
    result = runner.invoke(
        app, ["notes", "create", "--contact", str(cid), "--body", "hi"]
    )
    assert result.exit_code == 0, result.output
    assert httpx_mock.get_request().headers["X-On-Behalf-Of"] == str(obo)


def test_no_on_behalf_of_omits_header(httpx_mock: HTTPXMock):
    cid = uuid.uuid4()
    httpx_mock.add_response(
        url=re.compile(rf"{re.escape(BASE)}/api/v1/notes/?"),
        method="POST",
        json=_note_resp(),
    )
    result = runner.invoke(
        app, ["notes", "create", "--contact", str(cid), "--body", "hi"]
    )
    assert result.exit_code == 0, result.output
    assert "X-On-Behalf-Of" not in httpx_mock.get_request().headers


# ── users + api-keys admin ───────────────────────────────────────────────────


def _user_resp(**over) -> dict:
    d = {"id": str(uuid.uuid4()), "email": "a@b.com", "is_active": True, "is_superuser": False}
    d.update(over)
    return d


def test_users_create_builds_body(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url=re.compile(rf"{re.escape(BASE)}/api/v1/users/?"),
        method="POST",
        json=_user_resp(email="khan.aleisha@gmail.com", full_name="Aleisha Khan"),
    )
    result = runner.invoke(
        app,
        ["users", "create", "--email", "khan.aleisha@gmail.com",
         "--password", "s3cret-pw-123", "--full-name", "Aleisha Khan"],
    )
    assert result.exit_code == 0, result.output
    body = _request_json(httpx_mock)
    assert body["email"] == "khan.aleisha@gmail.com"
    assert body["password"] == "s3cret-pw-123"
    assert body["full_name"] == "Aleisha Khan"
    assert body["is_superuser"] is False


def test_apikeys_create_with_impersonation(httpx_mock: HTTPXMock):
    target = uuid.uuid4()
    httpx_mock.add_response(
        url=re.compile(rf"{re.escape(BASE)}/api/v1/users/me/api-keys/?"),
        method="POST",
        status_code=201,
        json={
            "id": str(uuid.uuid4()), "name": "janet", "key_prefix": "kindred_sk_",
            "owned_by_user_id": str(uuid.uuid4()), "can_impersonate": [str(target)],
            "created_at": NOW, "revoked_at": None, "last_used_at": None,
            "expires_at": None, "plaintext_key": "kindred_sk_xyz",
        },
    )
    result = runner.invoke(
        app, ["api-keys", "create", "--name", "janet", "--can-impersonate", str(target)]
    )
    assert result.exit_code == 0, result.output
    body = _request_json(httpx_mock)
    assert body["name"] == "janet"
    assert body["can_impersonate"] == [str(target)]
    assert "kindred_sk_xyz" in result.output
