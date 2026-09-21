#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.14"
# dependencies = ["typer>=0.12"]
# ///
"""Apply kindred on its configured Homelab deployment host."""

from __future__ import annotations

import json
import re
import shlex
import socket
import subprocess
import sys
import time
import urllib.request
from datetime import UTC, datetime
from pathlib import Path, PurePosixPath

import typer

HOMELAB_APP = "kindred"
HOMELAB_MODE = "bump"
ALLOW_LEGACY_APPLY = False
SYNC_CHECKOUT = False
DEPLOY_REPO_PATH = ""

DEPLOY_BRANCH = "main"
DEPLOY_HOST = "".lower()
DEPLOY_SSH_ALIAS = ""
HOMELAB_ROOT = Path.home() / "projects" / "Homelab"
HL_PATH = HOMELAB_ROOT / "infra" / "scripts" / "hl"
RESOLVER_PATH = HOMELAB_ROOT / "infra" / "scripts" / "resolve-stack.py"
REMOTE_HL_PATH = '"$HOME/projects/Homelab/infra/scripts/hl"'
RESOLVER_TIMEOUT_SECONDS = 45
COMPOSE_FILENAMES = ("docker-compose.yml", "docker-compose.yaml", "compose.yml", "compose.yaml")
LOKI_URL = "http://127.0.0.1:3100/loki/api/v1/push"
VERSION_TAG = re.compile(r"v[0-9]+\.[0-9]+\.[0-9]+(?:[-+][A-Za-z0-9.-]+)?\Z")

app = typer.Typer(add_completion=False)
_events: list[dict[str, object]] = []


def _execution_host() -> str:
    return socket.gethostname().split(".", 1)[0].lower()


def _log(level: str, msg: str, **context: object) -> None:
    event = {
        "level": level,
        "msg": msg,
        "time": datetime.now(UTC).isoformat(),
        **context,
    }
    _events.append(event)
    print(json.dumps(event, separators=(",", ":")), file=sys.stderr)


def _flush() -> None:
    try:
        values = [
            [
                str(int(datetime.fromisoformat(str(e["time"])).timestamp() * 1_000_000_000)),
                json.dumps(e),
            ]
            for e in _events
        ]
        payload = {
            "streams": [
                {
                    "stream": {
                        "job": "project-kit",
                        "script": "deploy-homelab",
                        "host": _execution_host(),
                    },
                    "values": values,
                }
            ]
        }
        request = urllib.request.Request(
            LOKI_URL,
            data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=3):
            pass
    except Exception:  # noqa: BLE001, S110 - logging must never block deployment
        pass


def _is_deploy_host() -> bool:
    return not DEPLOY_HOST or _execution_host() == DEPLOY_HOST


def _route() -> str:
    return "local" if _is_deploy_host() else f"ssh:{DEPLOY_SSH_ALIAS}"


def _normalize_stack_selector(value: str, label: str) -> str:
    if not value or value.startswith("/") or not re.fullmatch(r"[A-Za-z0-9._/-]+", value):
        raise ValueError(f"unsafe {label}: {value!r}")
    path = PurePosixPath(value)
    if ".." in path.parts:
        raise ValueError(f"unsafe {label}: {value!r}")
    return path.as_posix().strip("/")


def _resolve_stack_output(output: str) -> str:
    """Validate a resolver base/stack pair and return the relative stack path."""
    lines = output.splitlines()
    if len(lines) != 1:
        raise ValueError("stack resolver output must contain exactly one line")
    parts = lines[0].split("\t")
    if len(parts) != 2 or not all(parts):
        raise ValueError(f"malformed stack resolver output: {lines[0]!r}")
    base, stack = parts
    base_path = PurePosixPath(base)
    stack_path = PurePosixPath(stack)
    if not base_path.is_absolute() or not stack_path.is_absolute():
        raise ValueError("stack resolver paths must be absolute")
    if base_path.as_posix() != base or stack_path.as_posix() != stack:
        raise ValueError("stack resolver paths must be canonical")
    try:
        relative = stack_path.relative_to(base_path)
    except ValueError as exc:
        raise ValueError("resolved stack is outside the Homelab root") from exc
    if relative == PurePosixPath("."):
        raise ValueError("resolved stack cannot be the Homelab root")
    return _normalize_stack_selector(relative.as_posix(), "resolved stack path")


def _remote_resolver_command() -> str:
    selector = shlex.quote(HOMELAB_APP)
    return (
        'base="$HOME/projects/Homelab"; '
        f'candidate="$base"/{selector}; '
        'if [ ! -f "$candidate/docker-compose.yml" ] '
        '&& [ ! -f "$candidate/docker-compose.yaml" ] '
        '&& [ ! -f "$candidate/compose.yml" ] '
        '&& [ ! -f "$candidate/compose.yaml" ]; then '
        'printf "canonical Homelab stack path not found: %s\\n" "$candidate" >&2; '
        "exit 2; fi; "
        'stack="$(HOMELAB_BASE_DIR="$base" '
        f'"$base/infra/scripts/resolve-stack.py" {selector})" || exit $?; '
        'printf "%s\\t%s\\n" "$base" "$stack"'
    )


def _stack_resolution() -> str:
    if _is_deploy_host():
        candidate = HOMELAB_ROOT / HOMELAB_APP
        if not any((candidate / name).is_file() for name in COMPOSE_FILENAMES):
            raise RuntimeError(
                f"canonical Homelab stack path not found: {HOMELAB_APP!r}; "
                "migrate homelab_app to the audited path relative to the Homelab root"
            )
        command = [
            "env",
            f"HOMELAB_BASE_DIR={HOMELAB_ROOT}",
            str(RESOLVER_PATH),
            HOMELAB_APP,
        ]
        cwd = HOMELAB_ROOT
    else:
        if not DEPLOY_SSH_ALIAS:
            raise RuntimeError(f"deploy host is {DEPLOY_HOST!r}, but no SSH alias is configured")
        command = [
            "ssh",
            "-T",
            "-o",
            "BatchMode=yes",
            "-o",
            "ConnectTimeout=5",
            "-o",
            "ConnectionAttempts=1",
            DEPLOY_SSH_ALIAS,
            _remote_resolver_command(),
        ]
        cwd = None
    proc = subprocess.run(
        command,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        cwd=cwd,
        timeout=RESOLVER_TIMEOUT_SECONDS,
        check=False,
        start_new_session=True,
    )
    if proc.returncode != 0:
        detail = (proc.stderr or proc.stdout).strip()[:160]
        raise RuntimeError(f"stack resolver command failed: {detail}")
    if _is_deploy_host():
        return f"{HOMELAB_ROOT}\t{proc.stdout.strip()}\n"
    return proc.stdout


def _resolved_homelab_app() -> str:
    try:
        return _resolve_stack_output(_stack_resolution())
    except (FileNotFoundError, RuntimeError, subprocess.TimeoutExpired, ValueError) as exc:
        typer.echo(f"error: homelab stack resolution failed: {exc}", err=True)
        raise typer.Exit(code=1) from exc


def _run_hl(action: str, resolved_app: str) -> None:
    if _is_deploy_host():
        subprocess.run(
            [str(HL_PATH), action, resolved_app],
            cwd=HOMELAB_ROOT,
            check=True,
            text=True,
        )
        return
    if not DEPLOY_SSH_ALIAS:
        typer.echo(
            f"error: deploy host is {DEPLOY_HOST!r}, but no SSH alias is configured", err=True
        )
        raise typer.Exit(code=1)
    typer.echo(f"routing Homelab command to {DEPLOY_HOST} via {DEPLOY_SSH_ALIAS}")
    remote_command = " ".join((REMOTE_HL_PATH, shlex.quote(action), shlex.quote(resolved_app)))
    subprocess.run(
        [
            "ssh",
            "-T",
            "-o",
            "BatchMode=yes",
            "-o",
            "ConnectTimeout=5",
            "-o",
            "ConnectionAttempts=1",
            DEPLOY_SSH_ALIAS,
            remote_command,
        ],
        check=True,
        text=True,
    )


def _validated_version_tag(value: str) -> str:
    if not VERSION_TAG.fullmatch(value):
        raise RuntimeError(
            "version tag is required for Homelab bump deployment "
            "and must have the form vMAJOR.MINOR.PATCH"
        )
    return value


def _git_output(repo: Path, *args: str) -> str:
    return subprocess.run(
        ["git", "-C", str(repo), *args],
        check=True,
        capture_output=True,
        text=True,
    ).stdout.strip()


def _sync_local_checkout(tag: str) -> None:
    if not DEPLOY_REPO_PATH:
        raise RuntimeError("deployment checkout path is required when sync_checkout is enabled")
    repo = Path(DEPLOY_REPO_PATH).expanduser()
    if _git_output(repo, "branch", "--show-current") != DEPLOY_BRANCH:
        raise RuntimeError(f"deployment checkout is not on {DEPLOY_BRANCH}: {repo}")
    if _git_output(repo, "status", "--porcelain"):
        raise RuntimeError(f"deployment checkout is dirty: {repo}")
    subprocess.run(
        [
            "gitop",
            "git fetch origin --tags && git merge --ff-only "
            + shlex.quote(f"origin/{DEPLOY_BRANCH}"),
        ],
        cwd=repo,
        check=True,
        text=True,
    )
    head = _git_output(repo, "rev-parse", "HEAD")
    tag_commit = _git_output(repo, "rev-parse", tag + "^{commit}")
    if head != tag_commit:
        raise RuntimeError(f"{tag} does not resolve to the deployed checkout HEAD")


def _sync_remote_checkout(tag: str) -> None:
    if not DEPLOY_SSH_ALIAS:
        raise RuntimeError(f"deploy host is {DEPLOY_HOST!r}, but no SSH alias is configured")
    if not DEPLOY_REPO_PATH:
        raise RuntimeError("deployment checkout path is required when sync_checkout is enabled")
    repo = shlex.quote(DEPLOY_REPO_PATH)
    safe_tag = shlex.quote(tag)
    safe_branch = shlex.quote(DEPLOY_BRANCH)
    merge_command = shlex.quote(
        "git fetch origin --tags && git merge --ff-only " + shlex.quote(f"origin/{DEPLOY_BRANCH}")
    )
    command = (
        f"repo={repo}; tag={safe_tag}; branch={safe_branch}; "
        'cd "$repo" || exit $?; '
        'test "$(git branch --show-current)" = "$branch" || '
        '{ printf "deployment checkout is not on %s: %s\\n" "$branch" "$repo" >&2; exit 2; }; '
        'test -z "$(git status --porcelain)" || '
        '{ printf "deployment checkout is dirty: %s\\n" "$repo" >&2; exit 2; }; '
        f"gitop {merge_command} || exit $?; "
        "head=$(git rev-parse HEAD) || exit $?; "
        'tag_commit=$(git rev-parse "${tag}^{commit}") || exit $?; '
        'test "$head" = "$tag_commit" || '
        '{ printf "%s does not resolve to the deployed checkout HEAD\\n" "$tag" >&2; exit 2; }'
    )
    subprocess.run(
        [
            "ssh",
            "-T",
            "-o",
            "BatchMode=yes",
            "-o",
            "ConnectTimeout=5",
            "-o",
            "ConnectionAttempts=1",
            DEPLOY_SSH_ALIAS,
            command,
        ],
        check=True,
        text=True,
    )


def _sync_checkout(tag: str) -> None:
    if not SYNC_CHECKOUT:
        return
    if _is_deploy_host():
        _sync_local_checkout(tag)
    else:
        _sync_remote_checkout(tag)


def _run_bump(resolved_app: str, tag: str) -> None:
    if _is_deploy_host():
        subprocess.run(
            ["just", "bump", tag],
            cwd=HOMELAB_ROOT / resolved_app,
            check=True,
            text=True,
        )
        return
    if not DEPLOY_SSH_ALIAS:
        raise RuntimeError(f"deploy host is {DEPLOY_HOST!r}, but no SSH alias is configured")
    stack = shlex.quote(resolved_app)
    safe_tag = shlex.quote(tag)
    remote_command = f'cd "$HOME/projects/Homelab"/{stack} && just bump {safe_tag}'
    subprocess.run(
        [
            "ssh",
            "-T",
            "-o",
            "BatchMode=yes",
            "-o",
            "ConnectTimeout=5",
            "-o",
            "ConnectionAttempts=1",
            DEPLOY_SSH_ALIAS,
            remote_command,
        ],
        check=True,
        text=True,
    )


@app.command()
def main(
    env: str = typer.Option("prod", "--env"),
    tag: str = typer.Option("", "--tag"),
    dry_run: bool = typer.Option(False, "--dry-run"),
    rollback: bool = typer.Option(False, "--rollback"),
    status: bool = typer.Option(False, "--status"),
) -> None:
    started = time.monotonic()
    _log(
        "info",
        "started",
        app=HOMELAB_APP,
        env=env,
        execution_host=_execution_host(),
        deploy_host=DEPLOY_HOST or _execution_host(),
        route=_route(),
        tag=tag or None,
    )
    try:
        if status:
            resolved_app = _resolved_homelab_app()
            _run_hl("ps", resolved_app)
        elif rollback:
            typer.echo(
                "rollback: change the Homelab image pin to the previous version, "
                "then run `just deploy` again.",
                err=True,
            )
            raise typer.Exit(code=1)
        elif dry_run:
            resolved_app = _resolved_homelab_app()
            if HOMELAB_MODE == "bump":
                version_tag = _validated_version_tag(tag)
                typer.echo(
                    f"[dry-run] route={_route()} would sync {DEPLOY_REPO_PATH} and run: "
                    f"just bump {version_tag} in {resolved_app} (env={env})"
                )
            elif HOMELAB_MODE == "apply" and ALLOW_LEGACY_APPLY:
                typer.echo(
                    f"[dry-run] route={_route()} would run: hl up {resolved_app} " f"(env={env})"
                )
            else:
                raise RuntimeError(
                    "legacy Homelab apply deployment is disabled; "
                    "set allow_legacy_apply=true only for an explicit legacy opt-in"
                )
        else:
            resolved_app = _resolved_homelab_app()
            typer.echo(
                f"deploying {resolved_app} on " f"{DEPLOY_HOST or _execution_host()} (env={env})"
            )
            if HOMELAB_MODE == "bump":
                version_tag = _validated_version_tag(tag)
                _sync_checkout(version_tag)
                _run_bump(resolved_app, version_tag)
            elif HOMELAB_MODE == "apply" and ALLOW_LEGACY_APPLY:
                _run_hl("up", resolved_app)
            else:
                raise RuntimeError(
                    "legacy Homelab apply deployment is disabled; "
                    "set allow_legacy_apply=true only for an explicit legacy opt-in"
                )
    except BaseException as exc:
        _log(
            "error",
            "failed",
            app=HOMELAB_APP,
            error=type(exc).__name__,
            elapsed_s=round(time.monotonic() - started, 3),
        )
        raise
    else:
        _log(
            "info",
            "complete",
            app=HOMELAB_APP,
            elapsed_s=round(time.monotonic() - started, 3),
        )
    finally:
        _flush()


if __name__ == "__main__":
    app()
