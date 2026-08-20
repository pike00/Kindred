from fastapi.testclient import TestClient

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
