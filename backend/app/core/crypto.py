"""Symmetric encryption for at-rest secrets (OAuth refresh tokens, etc).

Uses Fernet with a key derived from settings.SECRET_KEY via HKDF-SHA256, so
no separate key management is required. Rotating SECRET_KEY invalidates all
ciphertexts produced under the old key.
"""

import base64
from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

from app.core.config import settings

_KDF_INFO = b"personal-crm/at-rest-secrets/v1"
_KDF_SALT = b"personal-crm-static-salt"


@lru_cache(maxsize=1)
def _fernet() -> Fernet:
    raw = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=_KDF_SALT,
        info=_KDF_INFO,
    ).derive(settings.SECRET_KEY.encode("utf-8"))
    return Fernet(base64.urlsafe_b64encode(raw))


def encrypt(plaintext: str) -> str:
    return _fernet().encrypt(plaintext.encode("utf-8")).decode("ascii")


def decrypt(ciphertext: str) -> str:
    try:
        return _fernet().decrypt(ciphertext.encode("ascii")).decode("utf-8")
    except InvalidToken as exc:
        raise ValueError(
            "ciphertext is invalid or was encrypted under a different key"
        ) from exc
