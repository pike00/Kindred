"""Tests for the KindredClient wrapper + a smoke test of the generated API."""

from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone

import pytest
from pytest_httpx import HTTPXMock

from kindred import UNSET, KindredClient
from kindred._generated.api.contacts import (
    contacts_get_contact,
    contacts_list_contacts,
)
from kindred._generated.api.utils import utils_health_check, utils_status
from kindred._generated.errors import UnexpectedStatus

BASE = "https://kindred.example.com"
API_KEY = "test-key"

CONTACT_ID = uuid.uuid4()
NOW = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

CONTACT_FIXTURE = {
    "id": str(CONTACT_ID),
    "first_name": "Alice",
    "last_name": "Smith",
    "is_favorite": False,
    "is_archived": False,
    "is_deceased": False,
    "do_not_contact": False,
    "is_pinned": False,
    "is_deleted": False,
    "tags": [],
    "avatar_url": None,
    "last_contacted_at": None,
    "created_at": NOW,
    "updated_at": NOW,
}


@pytest.fixture
def client():
    with KindredClient(base_url=BASE, api_key=API_KEY) as c:
        yield c


# ── KindredClient construction ──────────────────────────────────────────────


def test_init_strips_trailing_slash():
    k = KindredClient(base_url=f"{BASE}/", api_key=API_KEY)
    assert k.raw._base_url == BASE


def test_from_env_reads_required_vars(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("KINDRED_BASE_URL", BASE)
    monkeypatch.setenv("KINDRED_API_KEY", API_KEY)
    with KindredClient.from_env() as k:
        assert k.raw._base_url == BASE
        assert k.raw.token == API_KEY


def test_from_env_missing_url_raises(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.delenv("KINDRED_BASE_URL", raising=False)
    monkeypatch.setenv("KINDRED_API_KEY", API_KEY)
    with pytest.raises(KeyError, match="KINDRED_BASE_URL"):
        KindredClient.from_env()


def test_from_env_missing_key_raises(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("KINDRED_BASE_URL", BASE)
    monkeypatch.delenv("KINDRED_API_KEY", raising=False)
    with pytest.raises(KeyError, match="KINDRED_API_KEY"):
        KindredClient.from_env()


def test_from_env_timeout_override(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("KINDRED_BASE_URL", BASE)
    monkeypatch.setenv("KINDRED_API_KEY", API_KEY)
    monkeypatch.setenv("KINDRED_TIMEOUT", "5.5")
    k = KindredClient.from_env()
    assert k.raw._timeout == 5.5


def test_context_manager_yields_self(client):
    # `client` fixture already entered the with block.
    assert client.raw.get_httpx_client() is not None


# ── attaches auth header to outbound requests ───────────────────────────────


def test_auth_header_sent(httpx_mock: HTTPXMock, client):
    httpx_mock.add_response(
        url=re.compile(rf"{re.escape(BASE)}/api/v1/utils/health-check/?"),
        json=True,
    )
    utils_health_check.sync(client=client.raw)
    request = httpx_mock.get_request()
    assert request.headers["Authorization"] == f"Bearer {API_KEY}"


# ── generated API smoke tests through the wrapper ──────────────────────────


def test_health_check_sync(httpx_mock: HTTPXMock, client):
    httpx_mock.add_response(
        url=re.compile(rf"{re.escape(BASE)}/api/v1/utils/health-check/?"),
        json=True,
    )
    assert utils_health_check.sync(client=client.raw) is True


def test_status_sync(httpx_mock: HTTPXMock, client):
    httpx_mock.add_response(
        url=re.compile(rf"{re.escape(BASE)}/api/v1/utils/status/?"),
        json={"status": "ok", "version": "0.2.106", "git_hash": "abc1234", "hash": "abc1234"},
    )
    result = utils_status.sync(client=client.raw)
    assert result is not None
    assert result.status == "ok"
    assert result.version == "0.2.106"
    assert result.git_hash == "abc1234"
    assert result.hash_ == "abc1234"
    assert result.to_dict()["hash"] == "abc1234"


def test_contacts_list_parses_envelope(httpx_mock: HTTPXMock, client):
    httpx_mock.add_response(
        url=re.compile(rf"{re.escape(BASE)}/api/v1/contacts/\?.*"),
        json={"data": [CONTACT_FIXTURE], "count": 1},
    )
    result = contacts_list_contacts.sync(client=client.raw)
    assert result is not None
    assert result.count == 1
    assert len(result.data) == 1
    assert result.data[0].first_name == "Alice"


def test_contacts_list_with_search_param(httpx_mock: HTTPXMock, client):
    httpx_mock.add_response(
        url=re.compile(rf"{re.escape(BASE)}/api/v1/contacts/\?.*search=Alice.*"),
        json={"data": [CONTACT_FIXTURE], "count": 1},
    )
    result = contacts_list_contacts.sync(client=client.raw, search="Alice")
    assert result is not None
    assert result.count == 1


def test_contacts_get_404_raises_unexpected(httpx_mock: HTTPXMock, client):
    """404 isn't documented for this op, so it surfaces as UnexpectedStatus."""
    httpx_mock.add_response(
        url=f"{BASE}/api/v1/contacts/{CONTACT_ID}",
        status_code=404,
        json={"detail": "Not found"},
    )
    with pytest.raises(UnexpectedStatus) as exc_info:
        contacts_get_contact.sync(client=client.raw, contact_id=CONTACT_ID)
    assert exc_info.value.status_code == 404


# ── UNSET sentinel re-export still works ────────────────────────────────────


def test_unset_is_falsy():
    assert not UNSET
    assert UNSET is UNSET  # singleton-like
