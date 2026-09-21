#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.14"
# dependencies = ["typer>=0.12"]
# ///
"""Deploy kindred via remote-compose to its configured host."""

from __future__ import annotations

import json
import shlex
import socket
import subprocess
import sys
import time
import urllib.request
from datetime import UTC, datetime
from pathlib import Path

import typer

PROJECT_NAME = "kindred"
DEPLOY_HOST = "".lower()
DEPLOY_SSH_ALIAS = ""
REMOTE_APP_DIR = f"~/.local/share/project-kit-apps/{PROJECT_NAME}"
LOKI_URL = "http://127.0.0.1:3100/loki/api/v1/push"

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
                        "script": "deploy-remote-compose",
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
    return "local" if _is_deploy_host() else f"ssh:{DEPLOY_SSH_ALIAS or DEPLOY_HOST or 'ares'}"


@app.command()
def main(
    env: str = typer.Option("prod", "--env"),
    dry_run: bool = typer.Option(False, "--dry-run"),
    rollback: bool = typer.Option(False, "--rollback"),
    status: bool = typer.Option(False, "--status"),
) -> None:
    started = time.monotonic()
    ssh_alias = DEPLOY_SSH_ALIAS or DEPLOY_HOST or "ares"
    src_dir = Path("infra") / env

    _log(
        "info",
        "started",
        app=PROJECT_NAME,
        env=env,
        execution_host=_execution_host(),
        deploy_host=DEPLOY_HOST or _execution_host(),
        route=_route(),
    )

    try:
        if rollback:
            typer.echo(
                "remote-compose deploys do not support automatic rollback; "
                "revert your infra configuration in git and run `just deploy` again.",
                err=True,
            )
            raise typer.Exit(code=1)

        if status:
            remote_cmd = (
                f"source ~/.zshenv && (cd {REMOTE_APP_DIR} || "
                f"(echo 'App not deployed yet (directory missing)'; exit 1)) && docker compose ps"
            )
            if dry_run:
                if _is_deploy_host():
                    local_dir = Path("~/.local/share/project-kit-apps").expanduser() / PROJECT_NAME
                    local_cmd = "source ~/.zshenv && docker compose ps"
                    typer.echo(
                        f"[dry-run] route={_route()} would execute locally in {local_dir}: {local_cmd}"
                    )
                else:
                    typer.echo(
                        f"[dry-run] route={_route()} would run: ssh {ssh_alias} {shlex.quote(remote_cmd)}"
                    )
                return
            if _is_deploy_host():
                local_dir = Path("~/.local/share/project-kit-apps").expanduser() / PROJECT_NAME
                if not local_dir.is_dir():
                    typer.echo(f"App not deployed yet (directory {local_dir} missing)", err=True)
                    raise typer.Exit(code=1)
                subprocess.run(
                    "source ~/.zshenv && docker compose ps", shell=True, cwd=local_dir, check=True
                )
            else:
                subprocess.run(
                    ["ssh", ssh_alias, remote_cmd],
                    check=True,
                )
            return

        if not src_dir.is_dir():
            typer.echo(f"error: infrastructure directory '{src_dir}' does not exist", err=True)
            raise typer.Exit(code=1)

        has_sops = (src_dir / ".env.sops").is_file()
        compose_action = (
            'sops exec-env .env.sops "docker compose up -d"' if has_sops else "docker compose up -d"
        )
        remote_deploy_cmd = f"source ~/.zshenv && cd {REMOTE_APP_DIR} && {compose_action}"

        if dry_run:
            dest_spec = (
                str(Path("~/.local/share/project-kit-apps").expanduser() / PROJECT_NAME)
                if _is_deploy_host()
                else f"{ssh_alias}:{REMOTE_APP_DIR}/"
            )
            typer.echo(f"[dry-run] route={_route()} would rsync {src_dir}/ to {dest_spec}")
            if _is_deploy_host():
                local_dir = Path("~/.local/share/project-kit-apps").expanduser() / PROJECT_NAME
                local_cmd = (
                    f"source ~/.zshenv && cd {shlex.quote(str(local_dir))} && {compose_action}"
                )
                typer.echo(f"[dry-run] route={_route()} would execute locally: {local_cmd}")
            else:
                typer.echo(
                    f"[dry-run] route={_route()} would execute: ssh {ssh_alias} {shlex.quote(remote_deploy_cmd)}"
                )
            return

        typer.echo(
            f"deploying {PROJECT_NAME} via remote-compose to {DEPLOY_HOST or ssh_alias} (env={env})"
        )

        if _is_deploy_host():
            local_dir = Path("~/.local/share/project-kit-apps").expanduser() / PROJECT_NAME
            local_dir.mkdir(parents=True, exist_ok=True)
            subprocess.run(
                ["rsync", "-avz", "--delete", f"{src_dir}/", f"{local_dir}/"], check=True
            )
            local_cmd = f"source ~/.zshenv && cd {shlex.quote(str(local_dir))} && {compose_action}"
            subprocess.run(local_cmd, shell=True, check=True)
        else:
            subprocess.run(["ssh", ssh_alias, f"mkdir -p {REMOTE_APP_DIR}"], check=True)
            subprocess.run(
                ["rsync", "-avz", "--delete", f"{src_dir}/", f"{ssh_alias}:{REMOTE_APP_DIR}/"],
                check=True,
            )
            subprocess.run(["ssh", ssh_alias, remote_deploy_cmd], check=True)

    except BaseException as exc:
        _log(
            "error",
            "failed",
            app=PROJECT_NAME,
            error=type(exc).__name__,
            elapsed_s=round(time.monotonic() - started, 3),
        )
        raise
    else:
        _log(
            "info",
            "complete",
            app=PROJECT_NAME,
            elapsed_s=round(time.monotonic() - started, 3),
        )
    finally:
        _flush()


if __name__ == "__main__":
    app()
