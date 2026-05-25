"""Custom field management routes."""

import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.crud import (
    contact_visible,
    create_custom_field_definition,
    create_custom_field_value,
)
from app.models import (
    CustomFieldDefinition,
    CustomFieldDefinitionCreate,
    CustomFieldDefinitionPublic,
    CustomFieldDefinitionsPublic,
    CustomFieldDefinitionUpdate,
    CustomFieldValue,
    CustomFieldValueCreate,
    CustomFieldValuePublic,
    CustomFieldValuesPublic,
    CustomFieldValueUpdate,
    Ok,
)

router = APIRouter(prefix="/custom-fields", tags=["custom-fields"])


def _require_contact_visible(session: Any, user: Any, contact_id: uuid.UUID) -> None:
    if not contact_visible(session=session, user=user, contact_id=contact_id):
        raise HTTPException(status_code=404, detail="Contact not found")


# ─── Field Definitions ─────────────────────────────────────────────────────


@router.get("/definitions/", response_model=CustomFieldDefinitionsPublic)
def list_field_definitions(
    session: SessionDep,
    current_user: CurrentUser,
) -> CustomFieldDefinitionsPublic:
    """List all custom field definitions for the user."""
    statement = select(CustomFieldDefinition).where(
        CustomFieldDefinition.owner_id == current_user.id
    )
    definitions = session.exec(statement).all()

    return CustomFieldDefinitionsPublic(
        data=[CustomFieldDefinitionPublic.model_validate(d) for d in definitions],
        count=len(definitions),
    )


@router.post("/definitions/", response_model=CustomFieldDefinitionPublic)
def create_field_definition(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    def_in: CustomFieldDefinitionCreate,
) -> CustomFieldDefinitionPublic:
    """Create a new custom field definition."""
    definition = create_custom_field_definition(
        session=session, field_def_in=def_in, owner_id=current_user.id
    )
    return CustomFieldDefinitionPublic.model_validate(definition)


@router.patch("/definitions/{def_id}", response_model=CustomFieldDefinitionPublic)
def update_field_definition(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    def_id: uuid.UUID,
    def_in: CustomFieldDefinitionUpdate,
) -> CustomFieldDefinitionPublic:
    """Update a custom field definition."""
    definition = session.get(CustomFieldDefinition, def_id)
    if not definition:
        raise HTTPException(status_code=404, detail="Definition not found")
    if definition.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    update_data = def_in.model_dump(exclude_unset=True)
    definition.sqlmodel_update(update_data)
    session.add(definition)
    session.commit()
    session.refresh(definition)
    return CustomFieldDefinitionPublic.model_validate(definition)


@router.delete("/definitions/{def_id}", response_model=Ok)
def delete_field_definition(
    session: SessionDep,
    current_user: CurrentUser,
    def_id: uuid.UUID,
) -> Ok:
    """Delete a custom field definition."""
    definition = session.get(CustomFieldDefinition, def_id)
    if not definition:
        raise HTTPException(status_code=404, detail="Definition not found")
    if definition.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    session.delete(definition)
    session.commit()
    return Ok()


# ─── Field Values ──────────────────────────────────────────────────────────


@router.get("/values/contact/{contact_id}", response_model=CustomFieldValuesPublic)
def list_field_values(
    session: SessionDep,
    current_user: CurrentUser,
    contact_id: uuid.UUID,
) -> CustomFieldValuesPublic:
    """List custom field values for a contact."""
    _require_contact_visible(session, current_user, contact_id)

    statement = select(CustomFieldValue).where(
        CustomFieldValue.contact_id == contact_id
    )
    values = session.exec(statement).all()

    return CustomFieldValuesPublic(
        data=[CustomFieldValuePublic.model_validate(v) for v in values],
        count=len(values),
    )


@router.post("/values/", response_model=CustomFieldValuePublic)
def create_field_value(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    value_in: CustomFieldValueCreate,
) -> CustomFieldValuePublic:
    """Create a custom field value for a contact."""
    _require_contact_visible(session, current_user, value_in.contact_id)

    value = create_custom_field_value(session=session, field_value_in=value_in)
    return CustomFieldValuePublic.model_validate(value)


@router.patch("/values/{value_id}", response_model=CustomFieldValuePublic)
def update_field_value(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    value_id: uuid.UUID,
    value_in: CustomFieldValueUpdate,
) -> CustomFieldValuePublic:
    """Update a custom field value."""
    value = session.get(CustomFieldValue, value_id)
    if value is None:
        raise HTTPException(status_code=404, detail="Value not found")
    _require_contact_visible(session, current_user, value.contact_id)

    update_data = value_in.model_dump(exclude_unset=True)
    value.sqlmodel_update(update_data)
    session.add(value)
    session.commit()
    session.refresh(value)
    return CustomFieldValuePublic.model_validate(value)


@router.delete("/values/{value_id}", response_model=Ok)
def delete_field_value(
    session: SessionDep,
    current_user: CurrentUser,
    value_id: uuid.UUID,
) -> Ok:
    """Delete a custom field value."""
    value = session.get(CustomFieldValue, value_id)
    if value is None:
        raise HTTPException(status_code=404, detail="Value not found")
    _require_contact_visible(session, current_user, value.contact_id)

    session.delete(value)
    session.commit()
    return Ok()
