# /// script
# requires-python = ">=3.12"
# dependencies = ["httpx==0.28.1", "pydantic-settings==2.14.2"]
# ///
"""Verify the active preview or the public, versioned production API."""

from __future__ import annotations

import json
import re
import socket
import subprocess
import sys
from contextlib import suppress
from datetime import UTC, datetime
from typing import Literal

import httpx
from pydantic import BaseModel, Field, HttpUrl
from pydantic_settings import BaseSettings, SettingsConfigDict

PRODUCTION_URL = "https://kindred.khanpikehome.com"


class SmokeSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="SMOKE_", extra="ignore")

    target: Literal["preview", "production"] = "preview"
    base_url: HttpUrl | None = None
    expected_tag: str | None = None
    endpoint: str = "/api/v1/utils/health-check/"
    expected_status: int = Field(default=200, ge=100, le=599)
    timeout_seconds: float = Field(default=30, gt=0, le=120)


class ServiceStatus(BaseModel):
    status: Literal["ok"]
    version: str
    git_hash: str


def preview_url() -> str:
    assignments = subprocess.check_output(["just", "env"], text=True).splitlines()
    projects = [
        line.partition("=")[2]
        for line in assignments
        if line.startswith("COMPOSE_PROJECT_NAME=")
    ]
    if len(projects) != 1 or not re.fullmatch(r"[a-z0-9][a-z0-9_-]+", projects[0]):
        raise RuntimeError("Cannot resolve the active preview project")
    containers = subprocess.check_output(
        [
            "docker",
            "ps",
            "-q",
            "--filter",
            f"label=com.docker.compose.project={projects[0]}",
            "--filter",
            "label=com.docker.compose.service=backend",
        ],
        text=True,
    ).splitlines()
    if len(containers) != 1:
        raise RuntimeError("Expected one running backend in the active preview")
    bindings = subprocess.check_output(
        ["docker", "port", containers[0], "8000/tcp"], text=True
    ).splitlines()
    local = [
        binding for binding in bindings if re.fullmatch(r"127\.0\.0\.1:\d+", binding)
    ]
    if len(local) != 1:
        raise RuntimeError("Expected one isolated backend port")
    return "http://" + local[0]


def verify_api(
    client: httpx.Client,
    *,
    endpoint: str,
    expected_status: int,
    expected_tag: str | None,
) -> ServiceStatus:
    health = client.get(endpoint)
    if health.status_code != expected_status or health.json() is not True:
        raise RuntimeError("Unexpected health response")
    response = client.get("/api/v1/utils/status/")
    response.raise_for_status()
    status = ServiceStatus.model_validate(response.json())
    if expected_tag and status.version.lstrip("v") != expected_tag.lstrip("v"):
        raise RuntimeError("Deployed version does not match the release")
    if expected_tag and not re.fullmatch(r"[0-9a-f]{7,40}", status.git_hash):
        raise RuntimeError("Deployed commit metadata is missing")
    response = client.get("/api/v1/openapi.json")
    response.raise_for_status()
    paths = response.json()["paths"]
    collection = paths.get("/api/v1/voice-captures/", {})
    if not {"get", "post"}.issubset(collection):
        raise RuntimeError("Voice capture API is missing")
    for operation in ("analyze", "commit"):
        if not any(
            path.startswith("/api/v1/voice-captures/{")
            and path.endswith("/" + operation)
            and "post" in methods
            for path, methods in paths.items()
        ):
            raise RuntimeError("Voice capture operation is missing")
    return status


def main() -> int:
    events: list[dict[str, object]] = []
    labels = {
        "job": "kindred-smoke",
        "script": "smoke",
        "host": socket.gethostname().split(".")[0],
    }

    def log(level: str, msg: str, **context: object) -> None:
        event = {
            "level": level,
            "msg": msg,
            "time": datetime.now(UTC).isoformat(),
            **labels,
            **context,
        }
        events.append(event)
        print(json.dumps(event), file=sys.stderr)

    log("info", "started")
    try:
        settings = SmokeSettings()
        if settings.target == "production":
            if not settings.expected_tag or not re.fullmatch(
                r"v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?", settings.expected_tag
            ):
                raise ValueError("Production requires an expected release tag")
            if (
                settings.base_url
                and str(settings.base_url).rstrip("/") != PRODUCTION_URL
            ):
                raise ValueError("Production must use the public URL")
            base_url = PRODUCTION_URL
        else:
            base_url = preview_url()
            if settings.base_url and str(settings.base_url).rstrip("/") != base_url:
                raise ValueError("Preview must use the active worktree backend")
        with httpx.Client(
            base_url=base_url, timeout=settings.timeout_seconds
        ) as client:
            result = verify_api(
                client,
                endpoint=settings.endpoint,
                expected_status=settings.expected_status,
                expected_tag=settings.expected_tag,
            )
        log(
            "info",
            "complete",
            target=settings.target,
            version=result.version,
            git_hash=result.git_hash,
        )
        return 0
    except (
        httpx.HTTPError,
        ValueError,
        RuntimeError,
        KeyError,
        subprocess.CalledProcessError,
        OSError,
    ) as error:
        log("error", "failed", error_type=type(error).__name__)
        return 1
    finally:
        values = [
            [
                str(int(datetime.fromisoformat(str(event["time"])).timestamp() * 1e9)),
                json.dumps(event),
            ]
            for event in events
        ]
        with suppress(httpx.HTTPError, OSError):
            httpx.post(
                "https://loki.lab.khanpikehome.com/loki/api/v1/push",
                json={"streams": [{"stream": labels, "values": values}]},
                timeout=3,
            )


if __name__ == "__main__":
    raise SystemExit(main())
