"""Regression: confirm the legacy /groups endpoints stay gone after the
2026-05-06 merge of Group into Tag. If a future PR wires a Groups router
back without intent, these flip red."""

from fastapi.testclient import TestClient

from app.core.config import settings


def test_groups_list_returns_404(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.get(f"{settings.API_V1_STR}/groups/", headers=superuser_token_headers)
    assert r.status_code == 404


def test_groups_create_returns_404(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.post(
        f"{settings.API_V1_STR}/groups/",
        headers=superuser_token_headers,
        json={"name": "ghost"},
    )
    assert r.status_code == 404


def test_models_no_longer_export_group_symbols() -> None:
    """If someone re-introduces Group/ContactGroup, this test will fail loudly."""
    import app.models as models

    for sym in ("Group", "GroupCreate", "GroupUpdate", "GroupPublic", "ContactGroup"):
        assert not hasattr(models, sym), (
            f"app.models.{sym} re-appeared — Group was merged into Tag on 2026-05-06"
        )


def test_contact_model_has_no_groups_relationship() -> None:
    from app.models import Contact

    assert not hasattr(Contact, "groups"), (
        "Contact.groups relationship re-appeared — should be tags-only after merge"
    )


def test_contact_create_rejects_group_ids_field() -> None:
    """ContactCreate.group_ids was dropped in the merge."""
    from app.models import ContactCreate

    assert "group_ids" not in ContactCreate.model_fields
    assert "tag_ids" in ContactCreate.model_fields
