import importlib.metadata
import os
import subprocess

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from pydantic.networks import EmailStr
from redis import Redis
from sqlalchemy import text

from app.api.deps import get_current_active_superuser
from app.core.config import settings
from app.core.db import engine
from app.models import Message
from app.utils import generate_test_email, send_email

router = APIRouter(prefix="/utils", tags=["utils"])


class EnvironmentInfo(BaseModel):
    environment: str


class StatusInfo(BaseModel):
    status: str = "ok"
    version: str
    git_hash: str
    hash: str


class VersionInfo(BaseModel):
    version: str
    git_hash: str
    hash: str


class ReadyInfo(BaseModel):
    status: str = "ready"


def get_version() -> str:
    from_env = os.environ.get("APP_VERSION", "").strip().lstrip("v")
    if from_env:
        return from_env
    try:
        ver = importlib.metadata.version("app")
        if ver and ver != "0.0.0":
            return ver
    except Exception:
        pass
    try:
        tag = (
            subprocess.check_output(
                ["git", "describe", "--tags", "--abbrev=0"],
                stderr=subprocess.DEVNULL,
                text=True,
            )
            .strip()
            .lstrip("v")
        )
        if tag:
            return tag
    except Exception:
        pass
    return "0.2.106"


def get_git_hash() -> str:
    from_env = os.environ.get("GIT_HASH", "").strip()
    if from_env:
        return from_env
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"],
            stderr=subprocess.DEVNULL,
            text=True,
        ).strip()
    except Exception:
        return "unknown"


@router.post(
    "/test-email/",
    dependencies=[Depends(get_current_active_superuser)],
    status_code=201,
)
def test_email(email_to: EmailStr) -> Message:
    """
    Test emails.
    """
    email_data = generate_test_email(email_to=email_to)
    send_email(
        email_to=email_to,
        subject=email_data.subject,
        html_content=email_data.html_content,
    )
    return Message(message="Test email sent")


@router.get("/health-check/")
async def health_check() -> bool:
    return True


def _database_ready() -> bool:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


def _redis_ready() -> bool:
    try:
        client = Redis.from_url(
            settings.REDIS_URL,
            socket_connect_timeout=1,
            socket_timeout=1,
        )
        return bool(client.ping())
    except Exception:
        return False


@router.get("/ready/", response_model=ReadyInfo)
def readiness_check() -> ReadyInfo:
    """Return ready only when required backing services are reachable."""
    if not _database_ready():
        raise HTTPException(status_code=503, detail="Database is not ready")
    if not _redis_ready():
        raise HTTPException(status_code=503, detail="Redis is not ready")
    return ReadyInfo()


@router.get("/status/")
async def status() -> StatusInfo:
    ver = get_version()
    h = get_git_hash()
    return StatusInfo(status="ok", version=ver, git_hash=h, hash=h)


@router.get("/environment/")
async def environment() -> EnvironmentInfo:
    return EnvironmentInfo(environment=settings.ENVIRONMENT)


@router.get("/info/")
async def version_info() -> VersionInfo:
    ver = get_version()
    h = get_git_hash()
    return VersionInfo(version=ver, git_hash=h, hash=h)
