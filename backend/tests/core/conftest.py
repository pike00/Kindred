"""Override session-scoped fixtures that require a live DB for unit tests."""

from collections.abc import Generator

import pytest


@pytest.fixture(scope="session", autouse=True)
def db() -> Generator[None, None, None]:  # type: ignore[override]
    """No-op override: oidc unit tests don't need a database."""
    yield
