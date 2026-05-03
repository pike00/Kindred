"""Encryption utilities for sensitive data like OAuth tokens.

Uses Fernet (symmetric encryption) from the cryptography package
with a key derived from the application's SECRET_KEY.
"""
from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import os

from app.core.config import settings


# Derive a 32-byte Fernet key from SECRET_KEY
def _get_fernet_key() -> bytes:
    """Derive a Fernet key from the application's SECRET_KEY."""
    salt = b"personal-crm-email-oauth-salt"  # Fixed salt for key derivation
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(settings.SECRET_KEY.encode()))
    return key


_fernet = Fernet(_get_fernet_key())


def encrypt_token(token: str) -> str:
    """Encrypt a token string. Returns base64-encoded encrypted data as string."""
    encrypted = _fernet.encrypt(token.encode())
    return base64.urlsafe_b64encode(encrypted).decode()


def decrypt_token(encrypted_token: str) -> str:
    """Decrypt an encrypted token string. Returns the original token."""
    try:
        decoded = base64.urlsafe_b64decode(encrypted_token.encode())
        decrypted = _fernet.decrypt(decoded)
        return decrypted.decode()
    except InvalidToken:
        raise ValueError("Invalid or corrupted token data")
    except Exception as e:
        raise ValueError(f"Failed to decrypt token: {e}")


def encrypt_refresh_token(token: str | None) -> str | None:
    """Encrypt a refresh token if present."""
    if token is None:
        return None
    return encrypt_token(token)


def decrypt_refresh_token(encrypted: str | None) -> str | None:
    """Decrypt a refresh token if present."""
    if encrypted is None:
        return None
    return decrypt_token(encrypted)
