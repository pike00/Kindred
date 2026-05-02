"""Custom Radicale authentication module that validates against CRM users.

This module integrates with FastAPI's user database, allowing CardDAV clients
(iOS Contacts, macOS Contacts, DAVx5) to authenticate using their CRM credentials
via HTTP Basic Auth.
"""

import base64
from typing import Tuple

from radicale import config as radicale_config
from radicale.auth import BaseAuth
from sqlmodel import Session, create_engine, select

from app.core.config import settings
from app.core.security import password_hash
from app.models import User


class Auth(BaseAuth):
    """Authenticate CardDAV clients against the CRM user database.

    Supports HTTP Basic Auth. Clients should use their CRM email as username
    and their password as the password.

    Configuration in Radicale config:
        [auth]
        type = app.carddav.auth
    """

    def __init__(self, configuration: radicale_config.Configuration) -> None:
        """Initialize the auth module."""
        super().__init__(configuration)
        self._engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))

    def _verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash using pwdlib."""
        try:
            valid, new_hash = password_hash.verify_and_update(
                plain_password, hashed_password
            )
            return valid
        except Exception:
            return False

    def login(
        self, login: str, password: str, context: object | None = None
    ) -> Tuple[str, str] | None:
        """Authenticate a user given their credentials.

        Args:
            login: Username (email)
            password: Password
            context: Radicale auth context (not used)

        Returns:
            Tuple of (user_id, password) if authentication succeeds, None otherwise.
        """
        if not login or not password:
            return None

        with Session(self._engine) as db_session:
            user = db_session.exec(
                select(User).where(
                    User.email == login,
                    User.is_active.is_(True),
                )
            ).first()

            if not user or not user.hashed_password:
                return None

            if self._verify_password(password, user.hashed_password):
                return (user.email, password)

        return None


def get_user_from_header(authorization_header: str) -> tuple[str, str] | None:
    """Extract username and password from HTTP Basic Auth header.

    Args:
        authorization_header: The Authorization header value

    Returns:
        Tuple of (username, password) or None if parsing fails
    """
    if not authorization_header:
        return None

    parts = authorization_header.split()
    if len(parts) != 2 or parts[0].lower() != "basic":
        return None

    try:
        decoded = base64.b64decode(parts[1]).decode("utf-8")
        username, _, password = decoded.partition(":")
        return (username, password)
    except Exception:
        return None
