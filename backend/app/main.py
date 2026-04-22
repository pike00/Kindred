import sentry_sdk
from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.routing import APIRoute
from radicale import Application as RadicaleApp
from radicale.config import Configuration as RadicaleConfig
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.wsgi import WSGIMiddleware

from app.api.main import api_router
from app.core.config import settings


def custom_generate_unique_id(route: APIRoute) -> str:
    return f"{route.tags[0]}-{route.name}"


if settings.SENTRY_DSN and settings.ENVIRONMENT != "local":
    sentry_sdk.init(dsn=str(settings.SENTRY_DSN), enable_tracing=True)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    generate_unique_id_function=custom_generate_unique_id,
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


app.include_router(api_router, prefix=settings.API_V1_STR)
