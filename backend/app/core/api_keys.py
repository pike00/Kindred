"""API key generation, hashing, and lookup helpers.

Keys are stored as a sha256 hex digest of a 256-bit random body. sha256
is sufficient because the plaintext itself has 256 bits of entropy —
there's nothing to rainbow-table — and the deterministic digest gives us
direct DB lookup. ``key_prefix`` (first 8 chars after the prefix) is kept
in plaintext so the UI can show "kk_aBcDeFgH…" without retaining the secret.
"""

import hashlib
import secrets

KEY_PREFIX = "kk_"
PREFIX_DISPLAY_LEN = 8


def generate_key() -> tuple[str, str, str]:
    """Generate a new API key.

    Returns ``(plaintext, key_hash, key_prefix)``. The plaintext is shown
    to the user once and never persisted.
    """
    body = secrets.token_urlsafe(32)
    plaintext = f"{KEY_PREFIX}{body}"
    key_hash = hashlib.sha256(plaintext.encode("utf-8")).hexdigest()
    key_prefix = body[:PREFIX_DISPLAY_LEN]
    return plaintext, key_hash, key_prefix


def hash_key(plaintext: str) -> str:
    """Hash a plaintext key for DB lookup."""
    return hashlib.sha256(plaintext.encode("utf-8")).hexdigest()


def looks_like_api_key(token: str) -> bool:
    """Cheap discriminator for routing in the auth dep.

    JWTs are dot-separated base64; API keys start with ``kk_``. We never
    pass a JWT through the API-key path or vice versa.
    """
    return token.startswith(KEY_PREFIX)
