import base64
import time
from unittest.mock import patch

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

from app.core import oidc


def _b64(n: int) -> str:
    b = n.to_bytes((n.bit_length() + 7) // 8, "big")
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


@pytest.fixture
def rsa_key():
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


def _pem(key):
    return key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode()


def _jwks(key) -> dict:
    pn = key.public_key().public_numbers()
    return {"keys": [{"kty": "RSA", "kid": "test-key", "use": "sig",
                      "alg": "RS256", "n": _b64(pn.n), "e": _b64(pn.e)}]}


def _make_token(key, *, aud: str, iss: str, sub: str = "user-1",
                 email: str = "u@t.x", exp_offset: int = 300):
    now = int(time.time())
    return jwt.encode(
        {"sub": sub, "aud": aud, "iss": iss, "email": email,
         "iat": now, "exp": now + exp_offset},
        _pem(key), algorithm="RS256", headers={"kid": "test-key"},
    )


def _cf_env(monkeypatch):
    monkeypatch.setattr(oidc.settings, "OIDC_ISSUER_URL",
                        "https://team.cloudflareaccess.com")
    monkeypatch.setattr(oidc.settings, "OIDC_AUDIENCE", "aud-hash-123")
    monkeypatch.setattr(oidc.settings, "OIDC_JWKS_URL",
                        "https://team.cloudflareaccess.com/cdn-cgi/access/certs")


def test_verify_success(rsa_key, monkeypatch):
    _cf_env(monkeypatch)
    oidc._reset_cache_for_tests()
    token = _make_token(rsa_key, aud="aud-hash-123",
                         iss="https://team.cloudflareaccess.com")
    with patch("app.core.oidc._fetch_jwks", return_value=_jwks(rsa_key)):
        payload = oidc.verify_oidc_token(token)
    assert payload["sub"] == "user-1"
    assert payload["email"] == "u@t.x"


def test_wrong_audience(rsa_key, monkeypatch):
    _cf_env(monkeypatch)
    oidc._reset_cache_for_tests()
    token = _make_token(rsa_key, aud="other-aud",
                         iss="https://team.cloudflareaccess.com")
    with patch("app.core.oidc._fetch_jwks", return_value=_jwks(rsa_key)):
        with pytest.raises(oidc.OIDCError):
            oidc.verify_oidc_token(token)


def test_wrong_issuer(rsa_key, monkeypatch):
    _cf_env(monkeypatch)
    oidc._reset_cache_for_tests()
    token = _make_token(rsa_key, aud="aud-hash-123",
                         iss="https://attacker.example.com")
    with patch("app.core.oidc._fetch_jwks", return_value=_jwks(rsa_key)):
        with pytest.raises(oidc.OIDCError):
            oidc.verify_oidc_token(token)


def test_expired(rsa_key, monkeypatch):
    _cf_env(monkeypatch)
    oidc._reset_cache_for_tests()
    token = _make_token(rsa_key, aud="aud-hash-123",
                         iss="https://team.cloudflareaccess.com", exp_offset=-300)
    with patch("app.core.oidc._fetch_jwks", return_value=_jwks(rsa_key)):
        with pytest.raises(oidc.OIDCError):
            oidc.verify_oidc_token(token)


def test_missing_kid(rsa_key, monkeypatch):
    _cf_env(monkeypatch)
    oidc._reset_cache_for_tests()
    token = jwt.encode(
        {"sub": "u", "aud": "aud-hash-123",
         "iss": "https://team.cloudflareaccess.com",
         "iat": int(time.time()), "exp": int(time.time()) + 300},
        _pem(rsa_key), algorithm="RS256",
    )
    with patch("app.core.oidc._fetch_jwks", return_value=_jwks(rsa_key)):
        with pytest.raises(oidc.OIDCError):
            oidc.verify_oidc_token(token)


def test_not_configured(monkeypatch):
    monkeypatch.setattr(oidc.settings, "OIDC_ISSUER_URL", "")
    oidc._reset_cache_for_tests()
    with pytest.raises(oidc.OIDCError):
        oidc.verify_oidc_token("x.y.z")
