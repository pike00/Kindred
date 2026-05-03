"""CustomFields resource for Kindred SDK."""

from personal_crm_client import AuthenticatedClient, Client
from personal_crm_client.models import (
    CustomFieldDefinitionCreate, CustomFieldDefinitionUpdate, CustomFieldDefinitionsPublic,
    CustomFieldDefinitionPublic, CustomFieldValueCreate, CustomFieldValueUpdate,
    CustomFieldValuesPublic, CustomFieldValuePublic
)
from personal_crm_client.models import HTTPValidationError
from uuid import UUID


class CustomFieldsResource:
    """Resource for managing custom field definitions and values."""

    def __init__(self, client: AuthenticatedClient | Client):
        self._client = client

    # Field Definitions
    def list_definitions(self, *, skip: int = 0, limit: int = 100) -> CustomFieldDefinitionsPublic | HTTPValidationError | None:
        """List custom field definitions."""
        from personal_crm_client.api.custom_fields import custom_fields_list_field_definitions
        return custom_fields_list_field_definitions.sync(client=self._client, skip=skip, limit=limit)

    async def list_definitions_async(self, *, skip: int = 0, limit: int = 100) -> CustomFieldDefinitionsPublic | HTTPValidationError | None:
        """Async version of list_definitions()."""
        from personal_crm_client.api.custom_fields import custom_fields_list_field_definitions
        return await custom_fields_list_field_definitions.asyncio(client=self._client, skip=skip, limit=limit)

    def create_definition(self, definition: CustomFieldDefinitionCreate) -> CustomFieldDefinitionPublic | HTTPValidationError | None:
        """Create a new custom field definition."""
        from personal_crm_client.api.custom_fields import custom_fields_create_field_definition
        return custom_fields_create_field_definition.sync(client=self._client, json_body=definition)

    async def create_definition_async(self, definition: CustomFieldDefinitionCreate) -> CustomFieldDefinitionPublic | HTTPValidationError | None:
        """Async version of create_definition()."""
        from personal_crm_client.api.custom_fields import custom_fields_create_field_definition
        return await custom_fields_create_field_definition.asyncio(client=self._client, json_body=definition)

    def update_definition(self, field_id: UUID, definition: CustomFieldDefinitionUpdate) -> CustomFieldDefinitionPublic | HTTPValidationError | None:
        """Update a custom field definition."""
        from personal_crm_client.api.custom_fields import custom_fields_update_field_definition
        return custom_fields_update_field_definition.sync(client=self._client, field_id=field_id, json_body=definition)

    async def update_definition_async(self, field_id: UUID, definition: CustomFieldDefinitionUpdate) -> CustomFieldDefinitionPublic | HTTPValidationError | None:
        """Async version of update_definition()."""
        from personal_crm_client.api.custom_fields import custom_fields_update_field_definition
        return await custom_fields_update_field_definition.asyncio(client=self._client, field_id=field_id, json_body=definition)

    def delete_definition(self, field_id: UUID) -> CustomFieldDefinitionPublic | HTTPValidationError | None:
        """Delete a custom field definition."""
        from personal_crm_client.api.custom_fields import custom_fields_delete_field_definition
        return custom_fields_delete_field_definition.sync(client=self._client, field_id=field_id)

    async def delete_definition_async(self, field_id: UUID) -> CustomFieldDefinitionPublic | HTTPValidationError | None:
        """Async version of delete_definition()."""
        from personal_crm_client.api.custom_fields import custom_fields_delete_field_definition
        return await custom_fields_delete_field_definition.asyncio(client=self._client, field_id=field_id)

    # Field Values
    def list_values(self, *, contact_id: UUID, skip: int = 0, limit: int = 100) -> CustomFieldValuesPublic | HTTPValidationError | None:
        """List custom field values for a contact."""
        from personal_crm_client.api.custom_fields import custom_fields_list_field_values
        return custom_fields_list_field_values.sync(client=self._client, contact_id=contact_id, skip=skip, limit=limit)

    async def list_values_async(self, *, contact_id: UUID, skip: int = 0, limit: int = 100) -> CustomFieldValuesPublic | HTTPValidationError | None:
        """Async version of list_values()."""
        from personal_crm_client.api.custom_fields import custom_fields_list_field_values
        return await custom_fields_list_field_values.asyncio(client=self._client, contact_id=contact_id, skip=skip, limit=limit)

    def create_value(self, value: CustomFieldValueCreate) -> CustomFieldValuePublic | HTTPValidationError | None:
        """Create a new custom field value."""
        from personal_crm_client.api.custom_fields import custom_fields_create_field_value
        return custom_fields_create_field_value.sync(client=self._client, json_body=value)

    async def create_value_async(self, value: CustomFieldValueCreate) -> CustomFieldValuePublic | HTTPValidationError | None:
        """Async version of create_value()."""
        from personal_crm_client.api.custom_fields import custom_fields_create_field_value
        return await custom_fields_create_field_value.asyncio(client=self._client, json_body=value)

    def update_value(self, value_id: UUID, value: CustomFieldValueUpdate) -> CustomFieldValuePublic | HTTPValidationError | None:
        """Update a custom field value."""
        from personal_crm_client.api.custom_fields import custom_fields_update_field_value
        return custom_fields_update_field_value.sync(client=self._client, value_id=value_id, json_body=value)

    async def update_value_async(self, value_id: UUID, value: CustomFieldValueUpdate) -> CustomFieldValuePublic | HTTPValidationError | None:
        """Async version of update_value()."""
        from personal_crm_client.api.custom_fields import custom_fields_update_field_value
        return await custom_fields_update_field_value.asyncio(client=self._client, value_id=value_id, json_body=value)

    def delete_value(self, value_id: UUID) -> CustomFieldValuePublic | HTTPValidationError | None:
        """Delete a custom field value."""
        from personal_crm_client.api.custom_fields import custom_fields_delete_field_value
        return custom_fields_delete_field_value.sync(client=self._client, value_id=value_id)

    async def delete_value_async(self, value_id: UUID) -> CustomFieldValuePublic | HTTPValidationError | None:
        """Async version of delete_value()."""
        from personal_crm_client.api.custom_fields import custom_fields_delete_field_value
        return await custom_fields_delete_field_value.asyncio(client=self._client, value_id=value_id)
