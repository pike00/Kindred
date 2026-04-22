"""JWT verification against a remote JWKS. Provider-agnostic by design.

Used here for Cloudflare Access JWT assertions but accepts any JWKS-backed
issuer (Authelia, Auth0, Keycloak, Zitadel, ...). No OIDC discovery step;
JWKS URL is supplied explicitly via OIDC_JWKS_URL.
"""

from __future__ import annotations

import time
from typing import Any

import httpx
import jwt

from app.core.config import settings


class OIDCError(Exception):
    """Raised when a token cannot be verified."""


_JWKS_TTL_SEC = 3600
_ALLOWED_ALGS = ["RS256", "RS384", "RS512", "ES256", "ES384", "ES512"]
_LEEWAY_SEC = 60

_jwks_cache: tuple[float, dict[str, Any]] | None = None


def _reset_cache_for_tests() -> None:
    global _jwks_cache
    _jwks_cache = None


def _fetch_jwks(jwks_uri: str) -> dict[str, Any]:
    resp = httpx.get(jwks_uri, timeout=5.0)
    resp.raise_for_status()
    return resp.json()


def _get_jwks() -> dict[str, Any]:
    global _jwks_cache
    now = time.time()
    if _jwks_cache and (now - _jwks_cache[0]) < _JWKS_TTL_SEC:
        return _jwks_cache[1]
    jwks = _fetch_jwks(settings.OIDC_JWKS_URL)
    _jwks_cache = (now, jwks)
    return jwks


def _key_for_kid(jwks: dict[str, Any], kid: str) -> Any:
    for jwk in jwks.get("keys", []):
        if jwk.get("kid") == kid:
            return jwt.PyJWK(jwk).key
    raise OIDCError(f"Unknown kid: {kid}")


def verify_oidc_token(token: str) -> dict[str, Any]:
    """Verify token against configured issuer/audience. Returns decoded payload."""
    if not (
        settings.OIDC_ISSUER_URL and settings.OIDC_AUDIENCE and settings.OIDC_JWKS_URL
    ):
        raise OIDCError("OIDC not configured")
    try:
        header = jwt.get_unverified_header(token)
    except jwt.InvalidTokenError as e:
        raise OIDCError(f"Malformed JWT header: {e}") from e

    kid = header.get("kid")
    if not kid:
        raise OIDCError("Missing kid in JWT header")

    try:
        key = _key_for_kid(_get_jwks(), kid)
    except OIDCError:
        # refresh once on kid miss
        global _jwks_cache
        _jwks_cache = None
        key = _key_for_kid(_get_jwks(), kid)

    try:
        payload = jwt.decode(
            token,
            key,
            algorithms=_ALLOWED_ALGS,
            audience=settings.OIDC_AUDIENCE,
            issuer=settings.OIDC_ISSUER_URL.rstrip("/"),
            leeway=_LEEWAY_SEC,
        )
    except jwt.InvalidTokenError as e:
        raise OIDCError(f"Invalid token: {e}") from e

    if not payload.get("sub"):
        raise OIDCError("Missing sub claim")
    return payload
