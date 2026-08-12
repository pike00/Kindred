import importlib.metadata
import os
import subprocess

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from pydantic.networks import EmailStr

from app.api.deps import get_current_active_superuser
from app.core.config import settings
from app.models import Message
from app.utils import generate_test_email, send_email

router = APIRouter(prefix="/utils", tags=["utils"])


class EnvironmentInfo(BaseModel):
    environment: str


class VersionInfo(BaseModel):
    version: str
    git_hash: str


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


@router.get("/environment/")
async def environment() -> EnvironmentInfo:
    return EnvironmentInfo(environment=settings.ENVIRONMENT)


@router.get("/info/")
async def version_info() -> VersionInfo:
    try:
        ver = importlib.metadata.version("app")
    except Exception:
        ver = "0.2.106"
    try:
        git_hash = subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"],
            stderr=subprocess.DEVNULL,
            text=True,
        ).strip()
    except Exception:
        git_hash = os.environ.get("GIT_HASH", "unknown")
    return VersionInfo(version=ver, git_hash=git_hash)
