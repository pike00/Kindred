# Kindred SDK

A typed Python client for [Personal CRM](https://github.com/will/personal-crm), generated from its OpenAPI schema.

The SDK provides a clean, resource-oriented interface (`kindred_sdk`) built on top of the mechanically generated `personal_crm_client`. Use it for scripting, automations (including n8n custom nodes), and any future third-party integrations.

## Installation

```bash
pip install kindred-sdk
```

Or, if you're using Poetry:

```bash
poetry add kindred-sdk
```

## Quick Start

```python
from kindred_sdk import KindredClient

# Create a client (authenticated)
client = KindredClient(
    base_url="http://localhost:8000",
    token="your-api-token",
)

# List contacts
contacts = client.contacts.list()
if contacts and hasattr(contacts, 'data'):
    for contact in contacts.data:
        print(f"{contact.first_name} {contact.last_name}")

# Get a specific contact
from uuid import UUID
contact = client.contacts.get(contact_id=UUID("your-contact-uuid"))

# Create a new contact
from personal_crm_client.models import ContactCreate
new_contact = client.contacts.create(
    ContactCreate(first_name="John", last_name="Doe")
)

# Use async
import asyncio

async def main():
    async with KindredClient(
        base_url="http://localhost:8000",
        token="your-api-token",
    ) as client:
        contacts = await client.contacts.list_async()
        print(contacts)

asyncio.run(main())
```

## Resources

The SDK provides the following resource-oriented interfaces:

- `client.contacts` - Manage contacts (list, get, create, update, delete, restore, mentions, losing touch, household)
- `client.groups` - Manage contact groups
- `client.interactions` - Log and manage interactions
- `client.tags` - Manage tags
- `client.notes` - Manage notes with contact mentions
- `client.gifts` - Track gifts
- `client.debts` - Track debts between contacts
- `client.pets` - Manage contact pets
- `client.addresses` - Manage contact addresses
- `client.relationships` - Manage relationships between contacts
- `client.reminders` - Manage reminders (with snooze support)
- `client.life_events` - Track life events for contacts
- `client.journal` - Personal journal entries
- `client.custom_fields` - Custom field definitions and values
- `client.activity_logs` - Read-only access to activity logs
- `client.calendar` - Calendar views by month

## Regeneration

The `personal_crm_client` package is generated from the backend's OpenAPI schema using [openapi-python-client](https://github.com/openapi-generators/openapi-python-client). To regenerate:

```bash
# From the project root
docker compose exec backend uv run python -c "import json; from app.main import app; print(json.dumps(app.openapi()))" > openapi.json
cd kindred-sdk
openapi-python-client generate --url ../openapi.json --output . --overwrite
```

## Development

```bash
cd kindred-sdk
poetry install
poetry shell
```

Run linting:
```bash
ruff check .
```

## License

MIT (or your chosen license)
