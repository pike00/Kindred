"""Exercise target guards with fake CLIs; no Docker or browser is launched."""

import os
import subprocess
from pathlib import Path

import pytest

SCRIPT = Path(__file__).parents[1] / "run-e2e-prepush.sh"


@pytest.fixture
def run_preflight(tmp_path, monkeypatch):
    commands = tmp_path / "bin"
    commands.mkdir()
    repo = tmp_path / "repo"
    repo.mkdir()
    trace = tmp_path / "commands.log"
    stubs = {
        "git": 'printf "%s\\n" "$FAKE_ROOT"',
        "just": 'printf "COMPOSE_PROJECT_NAME=kindred-unit\\n"',
        "docker": 'if [[ "$1" == ps ]]; then printf "%s\\n" "${FAKE_CONTAINERS-backend-owned}"; else printf "127.0.0.1:18021\\n"; fi',
        "curl": "exit 19",
        "pnpm": "exit 23",
        "uv": "exit 23",
        "tailscale": "exit 23",
        "jq": "exit 23",
    }
    for name, body in stubs.items():
        path = commands / name
        path.write_text(
            '#!/bin/bash\nprintf "%s %s\\n" "${0##*/}" "$*" >> "$FAKE_TRACE"\n'
            + body
            + "\n"
        )
        path.chmod(0o755)
    monkeypatch.setenv("PATH", f"{commands}:/usr/bin:/bin")
    monkeypatch.setenv("FAKE_ROOT", str(repo))
    monkeypatch.setenv("FAKE_TRACE", str(trace))
    for name in (
        "PERSONAL_CRM_SKIP_E2E",
        "E2E_COMPOSE_PROJECT",
        "E2E_API_URL",
        "E2E_BASE_URL",
    ):
        monkeypatch.delenv(name, raising=False)

    def run(**overrides):
        result = subprocess.run(
            ["/bin/bash", str(SCRIPT)],
            env={**os.environ, **overrides},
            text=True,
            capture_output=True,
            timeout=10,
            check=False,
        )
        return result, trace.read_text()

    return run


@pytest.mark.parametrize("containers", ["", "one\ntwo"])
def test_refuses_missing_or_ambiguous_backend(run_preflight, containers):
    result, trace = run_preflight(FAKE_CONTAINERS=containers)
    assert result.returncode == 1
    assert "isolated backend" in result.stderr
    assert "label=com.docker.compose.project=kindred-unit" in trace
    assert "compose " not in trace
    assert "pnpm " not in trace


def test_refuses_another_project(run_preflight):
    result, trace = run_preflight(E2E_COMPOSE_PROJECT="unrelated-project")
    assert result.returncode == 1
    assert "does not belong" in result.stderr
    assert "docker " not in trace


def test_refuses_api_override_to_another_stack(run_preflight):
    result, trace = run_preflight(E2E_API_URL="http://127.0.0.1:8001")
    assert result.returncode == 1
    assert "does not match" in result.stderr
    assert "curl " not in trace


def test_checks_owned_backend_before_build_or_browser(run_preflight):
    result, trace = run_preflight()
    assert result.returncode == 19
    assert "http://127.0.0.1:18021/api/v1/utils/health-check/" in trace
    assert "pnpm " not in trace


def test_refuses_stale_external_frontend(run_preflight):
    result, trace = run_preflight(E2E_BASE_URL="https://other.example.invalid")
    assert result.returncode == 1
    assert "unset E2E_BASE_URL" in result.stderr
    assert "curl " not in trace
