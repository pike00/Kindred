"""OpenAPI operation IDs must be deterministic method-plus-path identifiers."""

import re

from app.main import app


def test_operation_ids_are_unique() -> None:
    schema = app.openapi()
    operation_ids: list[str] = []
    for operations in schema["paths"].values():
        for operation in operations.values():
            if isinstance(operation, dict) and "operationId" in operation:
                operation_ids.append(operation["operationId"])

    assert len(operation_ids) == len(set(operation_ids))

    for path, operations in schema["paths"].items():
        for method, operation in operations.items():
            if not isinstance(operation, dict):
                continue
            normalized_path = re.sub(
                r"[^a-z0-9]+", "_", path.strip("/").lower()
            ).strip("_")
            assert operation["operationId"] == f"{method}_{normalized_path}"

    snooze = schema["paths"]["/api/v1/contacts/{contact_id}/snooze"]
    assert (
        snooze["patch"]["operationId"]
        == "patch_api_v1_contacts_contact_id_snooze"
    )
    assert (
        snooze["post"]["operationId"]
        == "post_api_v1_contacts_contact_id_snooze"
    )
