"""OpenAPI operation IDs must stay unique."""

from app.main import app


def test_operation_ids_are_unique() -> None:
    schema = app.openapi()
    operation_ids: list[str] = []
    for operations in schema["paths"].values():
        for operation in operations.values():
            if isinstance(operation, dict) and "operationId" in operation:
                operation_ids.append(operation["operationId"])

    assert len(operation_ids) == len(set(operation_ids))

    snooze = schema["paths"]["/api/v1/contacts/{contact_id}/snooze"]
    assert snooze["patch"]["operationId"] == "contacts-update_contact_snooze"
    assert snooze["post"]["operationId"] == "contacts-create_contact_snooze"
