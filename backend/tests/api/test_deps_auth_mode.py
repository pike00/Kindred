from unittest.mock import patch

import pytest
from sqlmodel import Session
from starlette.requests import Request as StarletteRequest

from app.api import deps
from app.core import oidc
from app.core.db import engine


@pytest.fixture
def session():
    with Session(engine) as s:
        yield s


def _fake_request(
    *, header: str | None = None, cookie: str | None = None
) -> StarletteRequest:
    raw_headers: list[tuple[bytes, bytes]] = []
    if header:
        raw_headers.append((b"cf-access-jwt-assertion", header.encode()))
    if cookie:
        raw_headers.append((b"cookie", f"CF_Authorization={cookie}".encode()))
    scope = {
        "type": "http",
        "headers": raw_headers,
        "path": "/",
        "method": "GET",
        "query_string": b"",
        "raw_path": b"/",
        "client": ("test", 0),
    }
    return StarletteRequest(scope)


def test_oidc_mode_uses_verifier(monkeypatch, session):
    monkeypatch.setattr("app.core.config.settings.AUTH_MODE", "oidc")
    with (
        patch("app.core.oidc.verify_oidc_token") as v,
        patch("app.crud.get_or_create_user_from_claims") as p,
    ):
        v.return_value = {
            "iss": "https://team.cloudflareaccess.com",
            "sub": "s",
            "email": "oidc@t.x",
        }
        p.return_value = type("U", (), {"is_active": True, "id": "x"})()
        user = deps.get_current_user(
            request=_fake_request(header="fake.jwt.token"),
            session=session,
            local_token=None,
        )
    assert user.is_active


def test_oidc_mode_reads_cookie_when_header_absent(monkeypatch, session):
    monkeypatch.setattr("app.core.config.settings.AUTH_MODE", "oidc")
    with (
        patch("app.core.oidc.verify_oidc_token") as v,
        patch("app.crud.get_or_create_user_from_claims") as p,
    ):
        v.return_value = {
            "iss": "https://team.cloudflareaccess.com",
            "sub": "s",
            "email": "oidc@t.x",
        }
        p.return_value = type("U", (), {"is_active": True, "id": "x"})()
        user = deps.get_current_user(
            request=_fake_request(cookie="cookie.jwt.token"),
            session=session,
            local_token=None,
        )
    assert user.is_active
    # Confirm the verifier was called with the cookie value
    v.assert_called_once_with("cookie.jwt.token")


def test_both_mode_uses_cf_then_falls_back_to_local(monkeypatch, session):
    monkeypatch.setattr("app.core.config.settings.AUTH_MODE", "both")

    def _raise(_):
        raise oidc.OIDCError("nope")

    _local_user = type("U", (), {"is_active": True, "id": "local-id"})()
    with (
        patch("app.core.oidc.verify_oidc_token", side_effect=_raise),
        patch("app.api.deps._get_current_user_local") as local,
    ):
        local.return_value = _local_user
        user = deps.get_current_user(
            request=_fake_request(header="bad.cf.jwt"),
            session=session,
            local_token="local.bearer",
        )
    assert user is _local_user


def test_local_mode_ignores_cf_header(monkeypatch, session):
    monkeypatch.setattr("app.core.config.settings.AUTH_MODE", "local")
    _local_user = type("U", (), {"is_active": True, "id": "local-id"})()
    with patch("app.api.deps._get_current_user_local") as local:
        local.return_value = _local_user
        user = deps.get_current_user(
            request=_fake_request(header="cf.jwt.should.be.ignored"),
            session=session,
            local_token="local.bearer",
        )
    assert user is _local_user


def test_no_credentials_401(monkeypatch, session):
    monkeypatch.setattr("app.core.config.settings.AUTH_MODE", "both")
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as excinfo:
        deps.get_current_user(
            request=_fake_request(),
            session=session,
            local_token=None,
        )
    assert excinfo.value.status_code == 401
