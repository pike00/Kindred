from fastapi.testclient import TestClient

from app.api.routes import utils as utils_routes
from app.core.config import settings


def test_status_endpoint(client: TestClient) -> None:
    r = client.get(f"{settings.API_V1_STR}/status")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert "version" in data
    assert "git_hash" in data
    assert "hash" in data


def test_utils_status_endpoint(client: TestClient) -> None:
    r = client.get(f"{settings.API_V1_STR}/utils/status/")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert "version" in data
    assert "git_hash" in data
    assert "hash" in data


def test_root_status_endpoint(client: TestClient) -> None:
    r = client.get("/status")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert "version" in data
    assert "git_hash" in data
    assert "hash" in data


def test_utils_info_endpoint(client: TestClient) -> None:
    r = client.get(f"{settings.API_V1_STR}/utils/info/")
    assert r.status_code == 200
    data = r.json()
    assert "version" in data
    assert "git_hash" in data
    assert "hash" in data


def test_readiness_endpoint_reports_ready_when_dependencies_pass(
    client: TestClient,
    monkeypatch,
) -> None:
    monkeypatch.setattr(utils_routes, "_database_ready", lambda: True)
    monkeypatch.setattr(utils_routes, "_redis_ready", lambda: True)

    response = client.get(f"{settings.API_V1_STR}/utils/ready/")

    assert response.status_code == 200
    assert response.json() == {"status": "ready"}


def test_readiness_endpoint_fails_when_database_is_unavailable(
    client: TestClient,
    monkeypatch,
) -> None:
    monkeypatch.setattr(utils_routes, "_database_ready", lambda: False)
    monkeypatch.setattr(utils_routes, "_redis_ready", lambda: True)

    response = client.get(f"{settings.API_V1_STR}/utils/ready/")

    assert response.status_code == 503
    assert "database" in response.json()["detail"].lower()


def test_readiness_endpoint_fails_when_redis_is_unavailable(
    client: TestClient,
    monkeypatch,
) -> None:
    monkeypatch.setattr(utils_routes, "_database_ready", lambda: True)
    monkeypatch.setattr(utils_routes, "_redis_ready", lambda: False)

    response = client.get(f"{settings.API_V1_STR}/utils/ready/")

    assert response.status_code == 503
    assert "redis" in response.json()["detail"].lower()
