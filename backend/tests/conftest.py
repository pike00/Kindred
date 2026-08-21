import os

_dev_db = os.environ.get("POSTGRES_DB", "app")
_test_db = os.environ.get("POSTGRES_TEST_DB", f"{_dev_db}_test")
os.environ["POSTGRES_DB"] = _test_db


def _ensure_test_database() -> None:
    import psycopg

    with (
        psycopg.connect(
            host=os.environ["POSTGRES_SERVER"],
            port=int(os.environ.get("POSTGRES_PORT", "5432")),
            user=os.environ["POSTGRES_USER"],
            password=os.environ.get("POSTGRES_PASSWORD", ""),
            dbname="postgres",
            autocommit=True,
        ) as conn,
        conn.cursor() as cur,
    ):
        cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (_test_db,))
        if cur.fetchone() is None:
            cur.execute(f'CREATE DATABASE "{_test_db}"')


def _reset_test_schema() -> None:
    import psycopg

    with (
        psycopg.connect(
            host=os.environ["POSTGRES_SERVER"],
            port=int(os.environ.get("POSTGRES_PORT", "5432")),
            user=os.environ["POSTGRES_USER"],
            password=os.environ.get("POSTGRES_PASSWORD", ""),
            dbname=_test_db,
            autocommit=True,
        ) as conn,
        conn.cursor() as cur,
    ):
        cur.execute("DROP SCHEMA IF EXISTS public CASCADE")
        cur.execute("CREATE SCHEMA public")


def _migrate_test_database() -> None:
    from pathlib import Path

    from alembic.config import Config

    from alembic import command
    from app.core.config import settings

    # Resolve paths relative to this file so it works both in the container
    # (/app/backend) and in CI (/home/runner/work/.../backend), where the
    # previous hard-coded /app/backend paths did not exist.
    backend_dir = Path(__file__).resolve().parent.parent
    cfg = Config(str(backend_dir / "alembic.ini"))
    cfg.set_main_option("script_location", str(backend_dir / "app" / "alembic"))
    cfg.set_main_option("sqlalchemy.url", str(settings.SQLALCHEMY_DATABASE_URI))
    command.upgrade(cfg, "heads")


_ensure_test_database()
_reset_test_schema()
_migrate_test_database()


from collections.abc import Generator  # noqa: E402

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlmodel import Session  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.core.db import engine, init_db  # noqa: E402
from app.main import app  # noqa: E402
from tests.utils.user import authentication_token_from_email  # noqa: E402
from tests.utils.utils import get_superuser_token_headers  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def db() -> Generator[Session, None, None]:
    with Session(engine) as session:
        init_db(session)
        yield session


@pytest.fixture
def user_factory(db: Session):
    """Factory fixture to create users."""
    from app.crud import create_user
    from app.models import UserCreate
    from tests.utils.utils import random_email, random_lower_string

    def _user_factory(email=None, password=None):
        if email is None:
            email = random_email()
        if password is None:
            password = random_lower_string()
        user_in = UserCreate(email=email, password=password)
        return create_user(session=db, user_create=user_in)

    return _user_factory


@pytest.fixture
def tag_factory(db: Session):
    """Factory fixture to create tags."""
    from app.crud import create_tag
    from app.models import TagCreate

    def _tag_factory(user, name=None):
        if name is None:
            import uuid

            name = f"tag-{uuid.uuid4().hex[:8]}"
        tag_in = TagCreate(name=name, color="#ff0000")
        return create_tag(session=db, tag_in=tag_in, owner_id=user.id)

    return _tag_factory


@pytest.fixture(scope="module")
def client() -> Generator[TestClient, None, None]:
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def superuser_token_headers(client: TestClient) -> dict[str, str]:
    return get_superuser_token_headers(client)


@pytest.fixture(scope="module")
def normal_user_token_headers(client: TestClient, db: Session) -> dict[str, str]:
    return authentication_token_from_email(
        client=client, email=settings.EMAIL_TEST_USER, db=db
    )


@pytest.fixture
def session(db: Session) -> Session:
    """Alias for db fixture; some test modules use 'session' instead of 'db'."""
    return db


@pytest.fixture
def user(db: Session):
    """Create and return a random test user."""
    from tests.utils.user import create_random_user

    return create_random_user(db)


@pytest.fixture
def user_headers(client: TestClient, db: Session, user) -> dict[str, str]:
    """Return auth headers for the user fixture."""
    from tests.utils.user import authentication_token_from_email

    return authentication_token_from_email(client=client, email=user.email, db=db)


@pytest.fixture
def api_key_headers(db: Session, user) -> dict[str, str]:
    """Create an API key for the user fixture and return headers with it."""
    from app.crud import create_api_key
    from app.models import APIKeyCreate

    key_in = APIKeyCreate(name="test-key")
    _api_key, plaintext = create_api_key(session=db, key_in=key_in, owner_id=user.id)
    return {"Authorization": f"Bearer {plaintext}"}
