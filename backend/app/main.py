import importlib.metadata
import logging
import os
import subprocess
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

import sentry_sdk
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.routing import APIRoute
from fastapi.staticfiles import StaticFiles
from radicale import Application as RadicaleApp
from radicale.config import DEFAULT_CONFIG_SCHEMA  # noqa: E402
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


def _git_hash() -> str:
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"],
            stderr=subprocess.DEVNULL,
            text=True,
        ).strip()
    except Exception:
        return os.environ.get("GIT_HASH", "unknown")


def custom_generate_unique_id(route: APIRoute) -> str:
    return f"{route.tags[0]}-{route.name}"


if settings.SENTRY_DSN and settings.ENVIRONMENT != "local":
    sentry_sdk.init(dsn=str(settings.SENTRY_DSN), enable_tracing=True)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Print the one-time setup URL on first boot, Jupyter-style.

    - If setup is already complete, do nothing.
    - If a SetupState row already exists with a token but no admin yet, the
      same token keeps working — we don't regenerate it on every restart.
    - If there's no row at all, create one and emit a brand-new token.
    """
    git_hash = _git_hash()
    try:
        version = importlib.metadata.version("app")
    except importlib.metadata.PackageNotFoundError:
        version = "dev"
    logger.info(
        "Kindred starting  version=%s  git=%s  env=%s",
        version,
        git_hash,
        settings.ENVIRONMENT,
    )
    print(  # noqa: T201
        f"[kindred] version={version}  git={git_hash}  env={settings.ENVIRONMENT}",
        flush=True,
    )

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
radicale_configuration = RadicaleConfig(DEFAULT_CONFIG_SCHEMA)
radicale_configuration.update(
    {
        "auth": {"type": "app.carddav.auth"},
        "storage": {"type": "app.carddav.storage"},
        "rights": {"type": "app.carddav.rights"},
    }
)
radicale_app = RadicaleApp(radicale_configuration)
app.mount("/dav", WSGIMiddleware(radicale_app))


@app.get("/.well-known/carddav", tags=["carddav"])
def well_known_carddav():
    """Redirect to CardDAV server for iOS/macOS client discovery."""
    return RedirectResponse(url="/dav/", status_code=301)


# Serve uploaded files (avatars, etc.)
uploads_dir = Path("uploads")
if uploads_dir.exists():
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(setup_router)

# SPA mount. In prod (Dockerfile.prod) STATIC_DIR=/app/static contains the
# vite build output; in dev STATIC_DIR is unset and the SPA is served by
# `bun run dev` on port 5173 via Traefik (compose.dev.yml).
_static_dir = os.environ.get("STATIC_DIR")
if _static_dir and os.path.isdir(_static_dir):
    _assets_dir = os.path.join(_static_dir, "assets")
    if os.path.isdir(_assets_dir):
        app.mount("/assets", StaticFiles(directory=_assets_dir), name="assets")
    _index_html = os.path.join(_static_dir, "index.html")

    @app.get("/{full_path:path}", include_in_schema=False, tags=["spa"])
    async def spa_fallback(full_path: str):
        # API routes are matched by their own routers first; this is a
        # belt-and-braces guard against accidental future ordering changes.
        if full_path.startswith(("api/", "setup", "dav/", ".well-known/")):
            raise HTTPException(status_code=404)
        # Serve real static files at the root (site.webmanifest, favicon.ico,
        # robots.txt, etc.) instead of falling through to index.html, which
        # makes browsers report "Manifest: Syntax error" when parsing HTML as JSON.
        if full_path:
            candidate = os.path.normpath(os.path.join(_static_dir, full_path))
            if candidate.startswith(_static_dir + os.sep) and os.path.isfile(candidate):
                return FileResponse(candidate)
        return FileResponse(_index_html)


# Setup-gate middleware MUST be registered AFTER all routes so it sits
# outermost in the Starlette stack and intercepts every request.
app.add_middleware(SetupGateMiddleware)
