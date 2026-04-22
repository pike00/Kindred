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
    from alembic import command
    from alembic.config import Config

    from app.core.config import settings

    cfg = Config("alembic.ini")
    cfg.set_main_option("sqlalchemy.url", str(settings.SQLALCHEMY_DATABASE_URI))
    command.upgrade(cfg, "head")


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
