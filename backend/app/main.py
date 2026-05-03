import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.routing import APIRoute
from radicale import Application as RadicaleApp
from radicale.config import Configuration as RadicaleConfig
from sqlmodel import Session
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.wsgi import WSGIMiddleware

import app.audit  # noqa: F401 — registers before_flush listener
from app.api.main import api_router
from app.api.setup import router as setup_router
from app.core.config import settings
from app.core.db import engine
from app.core.setup_state import ensure_state_with_token
from app.middleware.setup_gate import SetupGateMiddleware

logger = logging.getLogger(__name__)


def custom_generate_unique_id(route: APIRoute) -> str:
    return f"{route.tags[0]}-{route.name}"


if settings.SENTRY_DSN and settings.ENVIRONMENT != "local":
    sentry_sdk.init(dsn=str(settings.SENTRY_DSN), enable_tracing=True)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Print the one-time setup URL on first boot, Jupyter-style.

    - If setup is already complete, do nothing.
    - If a SetupState row already exists with a token but no admin yet, the
      same token keeps working — we don't regenerate it on every restart.
    - If there's no row at all, create one and emit a brand-new token.
    """
    with Session(engine) as session:
        state, token = ensure_state_with_token(session)
    if not state.complete:
        if token is None:
            logger.warning(
                "Kindred is awaiting first-time setup, but the one-time token "
                "has already been issued in a prior boot and is not recoverable. "
                "Delete the setup_state row to issue a new one."
            )
        else:
            base = settings.FRONTEND_HOST.rstrip("/")
            msg = (
                "\n=================\n"
                " Kindred is awaiting first-time setup.\n"
                " Open this URL on the tailnet:\n"
                f"   {base}/setup?token={token}\n"
                " This URL will work exactly once.\n"
                "================="
            )
            logger.warning(msg)
            # Mirror to stdout for `docker logs` users without a structured handler.
            print(msg, flush=True)  # noqa: T201
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    generate_unique_id_function=custom_generate_unique_id,
    lifespan=lifespan,
)

# Set all CORS enabled origins
if settings.all_cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.all_cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Configure Radicale CardDAV server with PostgreSQL storage backend
from radicale.config import DEFAULT_CONFIG_SCHEMA  # noqa: E402

radicale_configuration = RadicaleConfig(DEFAULT_CONFIG_SCHEMA)
radicale_configuration.update(
    {
        "auth": {"type": "http_x_remote_user"},
        "storage": {"type": "app.carddav.storage"},
    },
    "app",
)
radicale_app = RadicaleApp(radicale_configuration)
app.mount("/dav", WSGIMiddleware(radicale_app))


@app.get("/.well-known/carddav", tags=["carddav"])
def well_known_carddav():
    """Redirect to CardDAV server for iOS/macOS client discovery."""
    return RedirectResponse(url="/dav/", status_code=301)


# Bare /api/v1/health endpoint exempted from the setup gate so liveness
# probes work even before the operator has completed first-boot setup.
@app.get(f"{settings.API_V1_STR}/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok"}


# /setup is not under /api/v1 — see app/api/setup.py for the rationale.
app.include_router(setup_router)
app.include_router(api_router, prefix=settings.API_V1_STR)

# Setup-gate middleware MUST be registered AFTER all routes so it sits
# outermost in the Starlette stack and intercepts every request.
app.add_middleware(SetupGateMiddleware)
