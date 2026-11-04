import importlib.util
import sys
from pathlib import Path

import httpx
import pytest

spec = importlib.util.spec_from_file_location(
    "kindred_smoke", Path(__file__).parents[1] / "smoke.py"
)
smoke = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = smoke
spec.loader.exec_module(smoke)


def client_for(*, health=True, version="0.2.124", commit="a" * 40, voice=True):
    def respond(request):
        if request.url.path.endswith("health-check/"):
            return httpx.Response(200, json=health)
        if request.url.path.endswith("status/"):
            return httpx.Response(
                200, json={"status": "ok", "version": version, "git_hash": commit}
            )
        paths = {
            "/api/v1/voice-captures/": {"get": {}, "post": {}},
            "/api/v1/voice-captures/{capture_id}/analyze": {"post": {}},
            "/api/v1/voice-captures/{capture_id}/commit": {"post": {}},
        }
        return httpx.Response(200, json={"paths": paths if voice else {}})

    return httpx.Client(
        base_url="https://synthetic.invalid", transport=httpx.MockTransport(respond)
    )


def verify(client):
    return smoke.verify_api(
        client,
        endpoint="/api/v1/utils/health-check/",
        expected_status=200,
        expected_tag="v0.2.124",
    )


def test_verifies_release_and_voice_routes():
    with client_for() as client:
        assert verify(client).version == "0.2.124"


@pytest.mark.parametrize(
    "changes",
    [
        {"health": False},
        {"version": "0.2.123"},
        {"commit": "unknown"},
        {"voice": False},
    ],
)
def test_rejects_incomplete_or_wrong_deployment(changes):
    with client_for(**changes) as client, pytest.raises(RuntimeError):
        verify(client)


def test_preview_discovers_only_its_own_backend(monkeypatch):
    commands = []
    outputs = iter(
        ["COMPOSE_PROJECT_NAME=kindred-test\n", "abc123\n", "127.0.0.1:18021\n"]
    )

    def run(command, **kwargs):
        commands.append(command)
        return next(outputs)

    monkeypatch.setattr(smoke.subprocess, "check_output", run)
    assert smoke.preview_url() == "http://127.0.0.1:18021"
    assert "label=com.docker.compose.project=kindred-test" in commands[1]


def test_production_refuses_preview_url(monkeypatch, capsys):
    monkeypatch.setenv("SMOKE_TARGET", "production")
    monkeypatch.setenv("SMOKE_EXPECTED_TAG", "v0.2.124")
    monkeypatch.setenv("SMOKE_BASE_URL", "http://127.0.0.1:18021")
    monkeypatch.setattr(smoke.httpx, "post", lambda *args, **kwargs: None)
    assert smoke.main() == 1
    assert '"msg": "failed"' in capsys.readouterr().err


def test_preview_refuses_another_stack(monkeypatch, capsys):
    monkeypatch.setenv("SMOKE_TARGET", "preview")
    monkeypatch.setenv("SMOKE_BASE_URL", "http://127.0.0.1:19999")
    monkeypatch.setattr(smoke, "preview_url", lambda: "http://127.0.0.1:18021")
    monkeypatch.setattr(smoke.httpx, "post", lambda *args, **kwargs: None)
    assert smoke.main() == 1
    assert '"msg": "failed"' in capsys.readouterr().err
