"""Environment-free tests executed in the actual final candidate image."""

import importlib.metadata
import importlib.util
import os
import poplib
import shutil
import ssl
import sys
import unittest
from datetime import UTC, datetime, timedelta
from pathlib import Path
from unittest.mock import Mock, patch
from urllib.parse import parse_qs, urlparse

PINS = {
    "pyjwt": "2.15.0",
    "certifi": "2026.10.19",
    "oauthlib": "4.0.0",
    "urllib3": "2.8.0",
}


class RuntimeSecurity(unittest.TestCase):
    def test_identity_and_writable_uploads(self):
        self.assertEqual((os.getuid(), os.getgid()), (10001, 10001))
        self.assertEqual(os.getcwd(), "/app/backend")
        self.assertEqual(os.environ["HOME"], "/home/kindred")
        status = Path("/proc/self/status").read_text()
        self.assertIn("NoNewPrivs:\t1", status)
        with self.assertRaises(OSError):
            Path("/app/forbidden-probe").write_text("must not write")
        probe = Path("uploads/security-probe")
        probe.write_text("synthetic upload")
        self.assertEqual(probe.read_text(), "synthetic upload")
        probe.unlink()
        self.assertTrue(Path("/app/static/index.html").is_file())

    def test_runtime_toolchain_and_security_versions(self):
        self.assertEqual(sys.version_info[:3], (3, 14, 10))
        for name, expected in PINS.items():
            self.assertEqual(importlib.metadata.version(name), expected, name)
        for name in ("uv", "uvx", "pip", "pip3", "gcc", "g++", "make"):
            self.assertIsNone(shutil.which(name), name)
        self.assertIsNone(importlib.util.find_spec("pip"))
        self.assertIsNone(importlib.util.find_spec("ensurepip"))
        for builder in ("hatchling", "setuptools", "wheel"):
            self.assertIsNone(importlib.util.find_spec(builder))
        for name in ("fastapi", "arq", "alembic", "curl"):
            self.assertIsNotNone(shutil.which(name), name)

    def test_pop3_rejects_controls_before_send(self):
        client = poplib.POP3.__new__(poplib.POP3)
        client._debugging = 0
        client.encoding = "UTF-8"
        client._putline = Mock()
        client._getresp = lambda: b"+OK"
        for code in [*range(32), 127]:
            for method in (client.user, client.pass_):
                with self.assertRaises(ValueError):
                    method(f"value{chr(code)}injected")
        client._putline.assert_not_called()
        client.user("ordinary")
        client._putline.assert_called_once_with(b"USER ordinary")

    def test_closed_signup_http_without_database_access(self):
        from app.api.deps import get_db
        from app.api.routes import users
        from app.core.config import Settings, settings
        from fastapi import FastAPI
        from fastapi.testclient import TestClient

        self.assertFalse(Settings.model_fields["USERS_OPEN_REGISTRATION"].default)
        self.assertFalse(settings.USERS_OPEN_REGISTRATION)
        app = FastAPI()
        app.include_router(users.router)
        app.dependency_overrides[get_db] = lambda: Mock()
        with (
            patch.object(users.crud, "get_user_by_email") as lookup,
            patch.object(users.crud, "create_user") as create,
        ):
            response = TestClient(app).post(
                "/users/signup",
                json={
                    "email": "synthetic@example.com",
                    "password": "synthetic-password",
                },
            )
            self.assertEqual(response.status_code, 403)
            self.assertEqual(
                response.json()["detail"],
                "Open user registration is forbidden on this server",
            )
            lookup.assert_not_called()
            create.assert_not_called()

    def test_explicit_registration_opt_in_keeps_validation(self):
        from app.api.routes import users
        from app.core.config import settings
        from app.models import UserRegister
        from fastapi import HTTPException

        user = UserRegister(
            email="synthetic@example.com", password="synthetic-password"
        )
        with (
            patch.object(settings, "USERS_OPEN_REGISTRATION", True),
            patch.object(
                users.crud, "get_user_by_email", return_value=object()
            ) as lookup,
        ):
            with self.assertRaises(HTTPException) as error:
                users.register_user(Mock(), user)
            self.assertEqual(error.exception.status_code, 400)
            lookup.assert_called_once()

    def test_jwt_valid_expired_and_bad_signature(self):
        import jwt

        key = "offline-test-key-0123456789-abcdefghijklmnopqrstuvwxyz"
        now = datetime.now(UTC)
        valid = jwt.encode(
            {"sub": "synthetic", "exp": now + timedelta(minutes=5)},
            key,
            algorithm="HS256",
        )
        self.assertEqual(
            jwt.decode(valid, key, algorithms=["HS256"])["sub"], "synthetic"
        )
        expired = jwt.encode(
            {"sub": "synthetic", "exp": now - timedelta(minutes=5)},
            key,
            algorithm="HS256",
        )
        with self.assertRaises(jwt.ExpiredSignatureError):
            jwt.decode(expired, key, algorithms=["HS256"])
        with self.assertRaises(jwt.InvalidSignatureError):
            jwt.decode(valid, key + "wrong", algorithms=["HS256"])

    def test_oauth_ca_and_worker_compatibility(self):
        import certifi
        import urllib3
        from app.worker import WorkerSettings
        from arq.worker import Worker
        from google_auth_oauthlib.flow import Flow

        ssl.create_default_context(cafile=certifi.where())
        self.assertTrue(urllib3.PoolManager and Worker and WorkerSettings.functions)
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": "synthetic.apps.googleusercontent.com",
                    "client_secret": "synthetic-placeholder",
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": ["https://example.invalid/callback"],
                }
            },
            scopes=["openid", "email"],
            redirect_uri="https://example.invalid/callback",
        )
        url, state = flow.authorization_url(access_type="offline", prompt="consent")
        query = parse_qs(urlparse(url).query)
        self.assertEqual(query["response_type"], ["code"])
        self.assertEqual(query["state"], [state])
        token = flow.oauth2session._client.parse_request_body_response(
            '{"access_token":"synthetic","token_type":"Bearer","expires_in":3600}'
        )
        self.assertEqual(token["access_token"], "synthetic")

    def test_migration_template_compatibility(self):
        from alembic.script import ScriptDirectory
        from mako.template import Template

        self.assertEqual(importlib.metadata.version("Mako"), "1.4.2")
        self.assertEqual(
            Template("revision = ${repr(revision)}").render(revision="synthetic"),
            "revision = 'synthetic'",
        )
        scripts = ScriptDirectory("app/alembic")
        self.assertTrue(scripts.get_heads())
        self.assertTrue(list(scripts.walk_revisions()))


if __name__ == "__main__":
    unittest.main(verbosity=2)
