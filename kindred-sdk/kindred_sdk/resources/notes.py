"""{resource_name} resource for Kindred SDK."""

from personal_crm_client import AuthenticatedClient, Client
from personal_crm_client.models import {model}Create, {model}Update, {models}, {model}Public
from personal_crm_client.models import HTTPValidationError
from uuid import UUID


class {class_name}:
    """Resource for managing {module}."""

    def __init__(self, client: AuthenticatedClient | Client):
        self._client = client

    def list(self, *, skip: int = 0, limit: int = 100) -> {models} | HTTPValidationError | None:
        """List {module}."""
        from personal_crm_client.api.{module} import {list_func}
        return {list_func}.sync(client=self._client, skip=skip, limit=limit)

    async def list_async(self, *, skip: int = 0, limit: int = 100) -> {models} | HTTPValidationError | None:
        """Async version of list()."""
        from personal_crm_client.api.{module} import {list_func}
        return await {list_func}.asyncio(client=self._client, skip=skip, limit=limit)

    def get(self, {item_id}: UUID) -> {model}Public | HTTPValidationError | None:
        """Get a single {singular} by ID."""
        from personal_crm_client.api.{module} import {get_func}
        return {get_func}.sync(client=self._client, {item_id}={item_id})

    async def get_async(self, {item_id}: UUID) -> {model}Public | HTTPValidationError | None:
        """Async version of get()."""
        from personal_crm_client.api.{module} import {get_func}
        return await {get_func}.asyncio(client=self._client, {item_id}={item_id})

    def create(self, item: {model}Create) -> {model}Public | HTTPValidationError | None:
        """Create a new {singular}."""
        from personal_crm_client.api.{module} import {create_func}
        return {create_func}.sync(client=self._client, json_body=item)

    async def create_async(self, item: {model}Create) -> {model}Public | HTTPValidationError | None:
        """Async version of create()."""
        from personal_crm_client.api.{module} import {create_func}
        return await {create_func}.asyncio(client=self._client, json_body=item)

    def update(self, {item_id}: UUID, item: {model}Update) -> {model}Public | HTTPValidationError | None:
        """Update an existing {singular}."""
        from personal_crm_client.api.{module} import {update_func}
        return {update_func}.sync(client=self._client, {item_id}={item_id}, json_body=item)

    async def update_async(self, {item_id}: UUID, item: {model}Update) -> {model}Public | HTTPValidationError | None:
        """Async version of update()."""
        from personal_crm_client.api.{module} import {update_func}
        return await {update_func}.asyncio(client=self._client, {item_id}={item_id}, json_body=item)

    def delete(self, {item_id}: UUID) -> {model}Public | HTTPValidationError | None:
        """Delete a {singular}."""
        from personal_crm_client.api.{module} import {delete_func}
        return {delete_func}.sync(client=self._client, {item_id}={item_id})

    async def delete_async(self, {item_id}: UUID) -> {model}Public | HTTPValidationError | None:
        """Async version of delete()."""
        from personal_crm_client.api.{module} import {delete_func}
        return await {delete_func}.asyncio(client=self._client, {item_id}={item_id})
