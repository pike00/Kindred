"""Regression tests for bounded import uploads."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.api.routes import ical as ical_routes
from app.api.routes import import_export as import_export_routes


def test_csv_preview_requires_authentication(client: TestClient) -> None:
    response = client.post(
        "/api/v1/import-export/import/csv/preview",
        files={"file": ("contacts.csv", b"first_name\nAlice\n", "text/csv")},
    )

    assert response.status_code == 401


def test_csv_preview_rejects_oversized_upload(
    client: TestClient,
    user_headers: dict,
    monkeypatch,
) -> None:
    monkeypatch.setattr(import_export_routes, "MAX_IMPORT_UPLOAD_BYTES", 8)

    response = client.post(
        "/api/v1/import-export/import/csv/preview",
        files={"file": ("contacts.csv", b"123456789", "text/csv")},
        headers=user_headers,
    )

    assert response.status_code == 413


def test_csv_preview_rejects_too_many_rows(
    client: TestClient,
    user_headers: dict,
    monkeypatch,
) -> None:
    monkeypatch.setattr(import_export_routes, "MAX_CSV_ROWS", 1)

    response = client.post(
        "/api/v1/import-export/import/csv/preview",
        files={
            "file": (
                "contacts.csv",
                b"first_name\nAlice\nBob\n",
                "text/csv",
            )
        },
        headers=user_headers,
    )

    assert response.status_code == 413


def test_vcard_import_rejects_oversized_upload(
    client: TestClient,
    user_headers: dict,
    monkeypatch,
) -> None:
    monkeypatch.setattr(import_export_routes, "MAX_IMPORT_UPLOAD_BYTES", 8)

    response = client.post(
        "/api/v1/import-export/import/vcard",
        files={"file": ("contacts.vcf", b"123456789", "text/vcard")},
        headers=user_headers,
    )

    assert response.status_code == 413


def test_ical_import_rejects_oversized_upload(
    client: TestClient,
    user_headers: dict,
    monkeypatch,
) -> None:
    monkeypatch.setattr(ical_routes, "MAX_ICAL_UPLOAD_BYTES", 8)

    response = client.post(
        "/api/v1/ical/upload",
        files={"file": ("calendar.ics", b"123456789", "text/calendar")},
        headers=user_headers,
    )

    assert response.status_code == 413
