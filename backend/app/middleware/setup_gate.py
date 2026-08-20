"""Setup-gate middleware.

Until ``setup_state.complete`` is True, every request other than the setup
endpoints, the API health check, and the OpenAPI/docs/static paths is
short-circuited with a 503 telling the operator to read the container log.
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable

from fastapi import Response, status
from fastapi.responses import JSONResponse
from sqlmodel import Session
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.core.config import settings
from app.core.db import engine
from app.core.setup_state import get_state

# Paths that must remain reachable while setup is pending. Anything else gets
# the 503. Matched as exact path or prefix.
_GATE_ALLOW_EXACT = frozenset(
    {
        "/setup",
        "/status",
        f"{settings.API_V1_STR}/status",
        f"{settings.API_V1_STR}/health",
        f"{settings.API_V1_STR}/utils/status",
        f"{settings.API_V1_STR}/utils/status/",
        f"{settings.API_V1_STR}/utils/info",
        f"{settings.API_V1_STR}/utils/info/",
        f"{settings.API_V1_STR}/utils/health-check",
        f"{settings.API_V1_STR}/utils/health-check/",
        # FastAPI docs surfaces — handy for an operator poking around.
        "/docs",
        "/redoc",
        f"{settings.API_V1_STR}/openapi.json",
        "/openapi.json",
    }
)
_GATE_ALLOW_PREFIX: tuple[str, ...] = (
    "/static/",
    "/docs/",
)


def _is_allowed(path: str) -> bool:
    if path in _GATE_ALLOW_EXACT:
        return True
    return any(path.startswith(p) for p in _GATE_ALLOW_PREFIX)


class SetupGateMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        if _is_allowed(request.url.path):
            return await call_next(request)
        with Session(engine) as session:
            state = get_state(session)
        if state is not None and state.complete:
            return await call_next(request)
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "detail": (
                    "Kindred is awaiting first-time setup. "
                    "Check container logs for the one-time /setup URL."
                )
            },
        )
