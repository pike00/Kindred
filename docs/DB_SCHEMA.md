# Personal CRM — Database Schema Documentation

> Generated from SQLModel definitions. All UUIDs are primary keys unless noted. All timestamps are UTC.

---

## Table of Contents

- [Core Models](#core-models)
- [Contact Management](#contact-management)
- [Relationships & Connections](#relationships--connections)
- [Activity & Timeline](#activity--timeline)
- [Planning & Tracking](#planning--tracking)
- [Journal & Notes](#journal--notes)
- [Webhooks](#webhooks)
- [Enums](#enums)
- [Foreign Key Relationships](#foreign-key-relationships)
- [Cascade Behavior](#cascade-behavior)

---

## Core Models

### `user` (from template, unchanged)

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PRIMARY KEY | |
| `email` | String(255) | UNIQUE, NOT NULL | EmailStr validation |
| `hashed_password` | String | NOT NULL | Argon2id hash |
| `is_active` | Boolean | NOT NULL, DEFAULT=True | |
| `is_superuser` | Boolean | NOT NULL, DEFAULT=False | |
| `full_name` | String(255) | NULLABLE | |
| `created_at` | DateTime(tz) | NOT NULL | UTC timezone |

**Relationships:**
- Tags (one-to-many via owner_id)
- Groups (one-to-many via owner_id)
- Contacts (one-to-many via owner_id)
- Interactions (one-to-many via owner_id)
- Reminders (one-to-many via owner_id)
- Gifts (one-to-many via owner_id)
- Debts (one-to-many via owner_id)
- LifeEvents (one-to-many via owner_id)
- Notes (one-to-many via owner_id)
- JournalEntries (one-to-many via owner_id)
- CustomFieldDefinitions (one-to-many via owner_id)
- WebhookEndpoints (one-to-many via owner_id)

---

## Contact Management

### `tag`

User-defined tags for organizing contacts.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PRIMARY KEY | |
| `owner_id` | UUID | NOT NULL, FK→user.id | CASCADE DELETE |
| `name` | String(100) | NOT NULL | Tag name, min 1 char |
| `color` | String(7) | NULLABLE | Hex color code (e.g., #ff0000) |
| `created_at` | DateTime(tz) | NOT NULL | UTC timezone |

**Indexes:** owner_id

---

### `contact_tag` (junction table)

Many-to-many relationship between contacts and tags.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `contact_id` | UUID | PRIMARY KEY, FK→contact.id | CASCADE DELETE |
| `tag_id` | UUID | PRIMARY KEY, FK→tag.id | CASCADE DELETE |

**Purpose:** Allows a contact to have multiple tags, and a tag to apply to multiple contacts.

---

### `group`

User-defined groups for organizing contacts (e.g., "Family", "Work Team", "Book Club").

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PRIMARY KEY | |
| `owner_id` | UUID | NOT NULL, FK→user.id | CASCADE DELETE |
| `name` | String(255) | NOT NULL | Group name, min 1 char |
| `description` | String(1000) | NULLABLE | Optional group description |
| `created_at` | DateTime(tz) | NOT NULL | UTC timezone |

**Indexes:** owner_id

---

### `contact_group` (junction table)

Many-to-many relationship between contacts and groups.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `contact_id` | UUID | PRIMARY KEY, FK→contact.id | CASCADE DELETE |
| `group_id` | UUID | PRIMARY KEY, FK→group.id | CASCADE DELETE |

**Purpose:** A contact can belong to multiple groups; a group can contain multiple contacts.

---

### `contact`

Core contact entity. The heart of the CRM.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PRIMARY KEY | |
| `owner_id` | UUID | NOT NULL, FK→user.id | CASCADE DELETE |
| `first_name` | String(255) | NOT NULL | Required, min 1 char |
| `last_name` | String(255) | NULLABLE | |
| `middle_name` | String(255) | NULLABLE | |
| `prefix` | String(50) | NULLABLE | e.g., "Dr.", "Mr." |
| `suffix` | String(50) | NULLABLE | e.g., "Jr.", "PhD" |
| `nickname` | String(255) | NULLABLE | |
| `company` | String(255) | NULLABLE | Organization name |
| `department` | String(255) | NULLABLE | Department within company |
| `title` | String(255) | NULLABLE | Job title |
| `birthday` | Date | NULLABLE | For milestone tracking |
| `notes` | String(10000) | NULLABLE | Freeform notes |
| `how_we_met` | String(2000) | NULLABLE | Story of how you met |
| `is_favorite` | Boolean | NOT NULL, DEFAULT=False | Star/pin contacts |
| `is_archived` | Boolean | NOT NULL, DEFAULT=False | Soft delete via list filters |
| `is_deceased` | Boolean | NOT NULL, DEFAULT=False | Mark contact as deceased |
| `deceased_at` | Date | NULLABLE | When they passed away |
| `contact_frequency_days` | Integer(1-3650) | NULLABLE | Target cadence for keep-in-touch (days) |
| `stage` | String(100) | NULLABLE | Kanban board stage (e.g., "Active", "Dormant", "Lost") |
| `vcard_raw` | String | NULLABLE | Raw RFC 6352 vCard 3.0 for CardDAV round-trip fidelity |
| `vcard_etag` | String(255) | NULLABLE | ETag from CardDAV server for sync detection |
| `avatar_url` | String(2048) | NULLABLE | URL or file path to avatar image |
| `last_contacted_at` | DateTime(tz) | NULLABLE | Auto-updated when interaction is logged |
| `created_at` | DateTime(tz) | NOT NULL | UTC timezone |
| `updated_at` | DateTime(tz) | NOT NULL | UTC timezone, auto-updated on change |

**Indexes:** owner_id, is_archived, is_favorite, contact_frequency_days

**Key Design Notes:**
- `vcard_raw` stores the raw vCard text to preserve Apple extensions (X-ABRELATEDNAMES, X-SOCIALPROFILE, etc.) for perfect round-trip sync with iOS via CardDAV
- `vcard_etag` tracks the ETag from the Radicale CardDAV server for incremental sync
- `last_contacted_at` is auto-computed from interactions (updated by `create_interaction` CRUD)
- `is_archived` provides soft-delete; archived contacts are excluded from list queries by default but can be queried
- `stage` enables kanban-style relationship tracking (e.g., moving contacts through "Prospect" → "Active" → "Dormant")

---

### `contact_field`

Flexible contact information (emails, phones, URLs, social media handles, instant messages).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PRIMARY KEY | |
| `contact_id` | UUID | NOT NULL, FK→contact.id | CASCADE DELETE |
| `field_type` | Enum | NOT NULL | email, phone, url, social, im, custom |
| `label` | String(100) | NOT NULL | e.g., "home", "work", "cell", "twitter", "github" |
| `value` | String(2048) | NOT NULL | The actual value (min 1 char) |
| `is_primary` | Boolean | NOT NULL, DEFAULT=False | Mark one as primary per type |
| `sort_order` | Integer | NOT NULL, DEFAULT=0 | Display ordering within type |

**Indexes:** contact_id, field_type

**Example Data:**
```
contact_id=abc, field_type=email, label=work, value=john@company.com, is_primary=true
contact_id=abc, field_type=phone, label=mobile, value=+1-555-1234, is_primary=true
contact_id=abc, field_type=social, label=twitter, value=@johndoe
contact_id=abc, field_type=im, label=slack, value=john.doe@workspace
```

---

### `address`

Physical addresses with optional geocoding.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PRIMARY KEY | |
| `contact_id` | UUID | NOT NULL, FK→contact.id | CASCADE DELETE |
| `label` | String(100) | NOT NULL, DEFAULT="home" | home, work, other |
| `street` | String(500) | NULLABLE | Street address |
| `extended` | String(500) | NULLABLE | Apartment, suite, etc. |
| `city` | String(255) | NULLABLE | |
| `region` | String(255) | NULLABLE | State, province, etc. |
| `postal_code` | String(50) | NULLABLE | ZIP, postal code, etc. |
| `country` | String(255) | NULLABLE | |
| `latitude` | Float | NULLABLE | For map visualization |
| `longitude` | Float | NULLABLE | For map visualization |

**Indexes:** contact_id

---

### `custom_field_definition`

Schema definitions for granular custom fields (per user).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PRIMARY KEY | |
| `owner_id` | UUID | NOT NULL, FK→user.id | CASCADE DELETE |
| `name` | String(255) | NOT NULL | Field name, min 1 char |
| `field_type` | String(50) | NOT NULL, DEFAULT="text" | text, number, date, boolean, select |
| `description` | String(500) | NULLABLE | Help text |
| `options` | String(2000) | NULLABLE | Comma-separated values for select type |
| `icon` | String(50) | NULLABLE | Icon slug for UI (e.g., "heart", "book") |
| `created_at` | DateTime(tz) | NOT NULL | UTC timezone |

**Indexes:** owner_id

**Example Data:**
```
name="Dietary Restrictions", field_type="text"
name="Preferred Filament", field_type="text"
name="Pet Name", field_type="text"
name="Years Known", field_type="number"
name="Last Known Location", field_type="text"
name="Anniversary", field_type="date"
name="Is Close Friend", field_type="boolean"
name="Hobby Category", field_type="select", options="Outdoor,Indoor,Creative,Tech"
```

---

### `custom_field_value`

Actual values for custom fields on contacts.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PRIMARY KEY | |
| `contact_id` | UUID | NOT NULL, FK→contact.id | CASCADE DELETE |
| `field_definition_id` | UUID | NOT NULL, FK→custom_field_definition.id | CASCADE DELETE |
| `value` | String(5000) | NOT NULL | The actual value |

**Indexes:** contact_id, field_definition_id

**Composite Unique Constraint:** (contact_id, field_definition_id) — one value per contact per field

---

### `pet`

Pets owned by contacts (for memorable conversations, gift ideas).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PRIMARY KEY | |
| `contact_id` | UUID | NOT NULL, FK→contact.id | CASCADE DELETE |
| `name` | String(255) | NOT NULL | Pet name, min 1 char |
| `species` | String(100) | NULLABLE | dog, cat, bird, etc. |
| `breed` | String(100) | NULLABLE | |
| `notes` | String(1000) | NULLABLE | e.g., "allergic to X", "birthday Y" |

**Indexes:** contact_id

---

## Relationships & Connections

### `relationship`

Directed relationships between contacts (family, romantic, friend, work, other).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PRIMARY KEY | |
| `contact_id` | UUID | NOT NULL, FK→contact.id | CASCADE DELETE | "From" contact |
| `related_contact_id` | UUID | NOT NULL, FK→contact.id | CASCADE DELETE | "To" contact |
| `relationship_type` | String(100) | NOT NULL | spouse, child, parent, sibling, friend, colleague, etc. |
| `notes` | String(1000) | NULLABLE | Additional context |

**Indexes:** contact_id, related_contact_id

**Note:** Relationships are directional. To model bidirectional relationships (e.g., "Alice is Bob's friend and Bob is Alice's friend"), create two relationship records.

---

## Activity & Timeline

### `interaction`

Logged interactions/touchpoints with a contact (call, in-person meeting, text, email, video, social, etc.).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PRIMARY KEY | |
| `owner_id` | UUID | NOT NULL, FK→user.id | CASCADE DELETE |
| `contact_id` | UUID | NOT NULL, FK→contact.id | CASCADE DELETE |
| `channel` | Enum | NOT NULL | call, in_person, text, email, video, social, other |
| `occurred_at` | DateTime(tz) | NOT NULL | When the interaction happened |
| `notes` | String(10000) | NULLABLE | Conversation summary, action items, etc. |
| `mood` | String(50) | NULLABLE | Emoji or keyword (e.g., "😊", "happy", "rushed") |
| `duration_minutes` | Integer(≥0) | NULLABLE | Length of interaction |
| `created_at` | DateTime(tz) | NOT NULL | When logged (may be after occurred_at) |

**Indexes:** contact_id, owner_id, occurred_at, channel

**Key Design Note:**
- Creating an interaction automatically updates `contact.last_contacted_at` via `create_interaction()` CRUD function
- Enables "losing touch" cadence detection (compare last_contacted_at to contact_frequency_days)

---

### `note`

Timestamped freeform notes attached to a specific contact.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PRIMARY KEY | |
| `owner_id` | UUID | NOT NULL, FK→user.id | CASCADE DELETE |
| `contact_id` | UUID | NOT NULL, FK→contact.id | CASCADE DELETE |
| `body` | String(50000) | NOT NULL | Note text, min 1 char |
| `created_at` | DateTime(tz) | NOT NULL | UTC timezone |
| `updated_at` | DateTime(tz) | NOT NULL | UTC timezone, auto-updated on change |

**Indexes:** contact_id, owner_id, created_at

---

### `journal_entry`

Personal journal entries (not tied to a specific contact).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PRIMARY KEY | |
| `owner_id` | UUID | NOT NULL, FK→user.id | CASCADE DELETE |
| `body` | String(50000) | NOT NULL | Entry text, min 1 char |
| `mood` | String(50) | NULLABLE | Emoji or keyword |
| `entry_date` | Date | NOT NULL | Date of entry (may be past or present) |
| `created_at` | DateTime(tz) | NOT NULL | UTC timezone |
| `updated_at` | DateTime(tz) | NOT NULL | UTC timezone, auto-updated on change |

**Indexes:** owner_id, entry_date

---

## Planning & Tracking

### `reminder`

Scheduled reminders (contact-specific or standalone).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PRIMARY KEY | |
| `owner_id` | UUID | NOT NULL, FK→user.id | CASCADE DELETE |
| `contact_id` | UUID | NULLABLE, FK→contact.id | CASCADE DELETE | Optional; standalone reminders allowed |
| `title` | String(500) | NOT NULL | Reminder title, min 1 char |
| `description` | String(2000) | NULLABLE | Details |
| `remind_at` | DateTime(tz) | NOT NULL | When to remind |
| `frequency` | Enum | NOT NULL, DEFAULT=once | once, daily, weekly, monthly, yearly |
| `is_active` | Boolean | NOT NULL, DEFAULT=True | Enable/disable without deleting |
| `last_sent_at` | DateTime(tz) | NULLABLE | When the last reminder was sent |
| `snoozed_until` | DateTime(tz) | NULLABLE | Snooze until this time |
| `created_at` | DateTime(tz) | NOT NULL | UTC timezone |

**Indexes:** owner_id, contact_id, remind_at, is_active

**Key Design Note:**
- Recurring reminders are processed by ARQ worker job `check_reminders()` which fires daily
- Supports "smart cadences" for keep-in-touch tracking

---

### `life_event`

Important milestones in a contact's life (job change, birthday, move, wedding, baby, graduation).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PRIMARY KEY | |
| `owner_id` | UUID | NOT NULL, FK→user.id | CASCADE DELETE |
| `contact_id` | UUID | NOT NULL, FK→contact.id | CASCADE DELETE |
| `event_type` | String(100) | NOT NULL | job_change, move, wedding, baby, graduation, birthday, anniversary, etc. |
| `title` | String(500) | NOT NULL | Event title, min 1 char |
| `description` | String(2000) | NULLABLE | Additional details |
| `occurred_at` | Date | NOT NULL | When the event happened |
| `create_annual_reminder` | Boolean | NOT NULL, DEFAULT=False | Auto-create recurring reminder for this date |
| `created_at` | DateTime(tz) | NOT NULL | UTC timezone |

**Indexes:** contact_id, owner_id, occurred_at

**Example Data:**
```
event_type=birthday, title="Jane's Birthday", occurred_at=1985-03-15, create_annual_reminder=true
event_type=job_change, title="Promoted to VP", occurred_at=2024-01-10
event_type=wedding, title="Got married", occurred_at=2020-06-20
```

---

### `gift`

Gift ideas and tracking for contacts.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PRIMARY KEY | |
| `owner_id` | UUID | NOT NULL, FK→user.id | CASCADE DELETE |
| `contact_id` | UUID | NOT NULL, FK→contact.id | CASCADE DELETE |
| `name` | String(500) | NOT NULL | Gift name, min 1 char |
| `description` | String(2000) | NULLABLE | |
| `status` | Enum | NOT NULL, DEFAULT=idea | idea, given, received |
| `occasion` | String(255) | NULLABLE | Birthday, Christmas, Housewarming, etc. |
| `date` | Date | NULLABLE | When given/received |
| `value_amount` | Float | NULLABLE | Cost/value |
| `value_currency` | String(3) | NOT NULL, DEFAULT="USD" | ISO 4217 currency code |
| `url` | String(2048) | NULLABLE | Link to product (e.g., Amazon) |
| `created_at` | DateTime(tz) | NOT NULL | UTC timezone |

**Indexes:** contact_id, owner_id, status

**Key Design Note:**
- Tracks both gift ideas and gifts that have been given/received
- `url` enables shopping links and wishlists

---

### `debt`

Track money owed to/from contacts.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PRIMARY KEY | |
| `owner_id` | UUID | NOT NULL, FK→user.id | CASCADE DELETE |
| `contact_id` | UUID | NOT NULL, FK→contact.id | CASCADE DELETE |
| `direction` | Enum | NOT NULL | i_owe (you owe them), they_owe (they owe you) |
| `amount` | Float | NOT NULL, >0 | Amount of debt |
| `currency` | String(3) | NOT NULL, DEFAULT="USD" | ISO 4217 currency code |
| `reason` | String(1000) | NULLABLE | What it was for |
| `is_settled` | Boolean | NOT NULL, DEFAULT=False | Mark as settled |
| `settled_at` | Date | NULLABLE | When settled |
| `created_at` | DateTime(tz) | NOT NULL | UTC timezone |

**Indexes:** contact_id, owner_id, is_settled

---

## Journal & Notes

(See Journal & Notes section in Activity & Timeline above)

---

## Webhooks

### `webhook_endpoint`

Inbound/outbound webhook configurations for triggering actions (n8n integration, smart lock control, etc.).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PRIMARY KEY | |
| `owner_id` | UUID | NOT NULL, FK→user.id | CASCADE DELETE |
| `name` | String(255) | NOT NULL | Webhook name, min 1 char |
| `url` | String(2048) | NULLABLE | Outbound target URL (required for outbound) |
| `direction` | String(10) | NOT NULL | "inbound" or "outbound" |
| `event_types` | String(1000) | NULLABLE | Comma-separated event types (e.g., "contact.created,interaction.logged") |
| `is_active` | Boolean | NOT NULL, DEFAULT=True | Enable/disable webhook |
| `secret` | String(255) | NULLABLE | HMAC secret for verifying inbound webhooks |
| `api_key` | String(255) | NOT NULL | Key for authenticating inbound webhook requests |
| `created_at` | DateTime(tz) | NOT NULL | UTC timezone |

**Indexes:** owner_id, direction

**Key Design Note:**
- Inbound webhooks: external systems (n8n, Aqara, etc.) POST to `/api/v1/webhooks/{webhook_id}?api_key=...`
- Outbound webhooks: triggered by events (contact created, interaction logged) and POST to configured `url` with signed payload
- Enables automation: lock unlock on contact arrival, n8n workflows on interaction logged, etc.

---

## Enums

### `ContactFieldType`
- `email`
- `phone`
- `url`
- `social` — social media handle
- `im` — instant messaging (Slack, Discord, etc.)
- `custom` — user-defined

### `GiftStatus`
- `idea` — potential gift idea
- `given` — you gave this gift
- `received` — you received this gift

### `InteractionChannel`
- `call` — phone/voice call
- `in_person` — face-to-face meeting
- `text` — SMS, messaging
- `email`
- `video` — video call (Zoom, Teams, etc.)
- `social` — social media interaction
- `other`

### `ReminderFrequency`
- `once` — one-time reminder
- `daily`
- `weekly`
- `monthly`
- `yearly`

### `DebtDirection`
- `i_owe` — you owe them money
- `they_owe` — they owe you money

---

## Foreign Key Relationships

All foreign keys use **CASCADE DELETE** to maintain referential integrity:

- `tag.owner_id` → `user.id`
- `contact_tag.contact_id` → `contact.id`
- `contact_tag.tag_id` → `tag.id`
- `group.owner_id` → `user.id`
- `contact_group.contact_id` → `contact.id`
- `contact_group.group_id` → `group.id`
- `contact.owner_id` → `user.id`
- `contact_field.contact_id` → `contact.id`
- `address.contact_id` → `contact.id`
- `relationship.contact_id` → `contact.id`
- `relationship.related_contact_id` → `contact.id`
- `pet.contact_id` → `contact.id`
- `custom_field_definition.owner_id` → `user.id`
- `custom_field_value.contact_id` → `contact.id`
- `custom_field_value.field_definition_id` → `custom_field_definition.id`
- `interaction.owner_id` → `user.id`
- `interaction.contact_id` → `contact.id`
- `note.owner_id` → `user.id`
- `note.contact_id` → `contact.id`
- `journal_entry.owner_id` → `user.id`
- `reminder.owner_id` → `user.id`
- `reminder.contact_id` → `contact.id` (NULLABLE)
- `life_event.owner_id` → `user.id`
- `life_event.contact_id` → `contact.id`
- `gift.owner_id` → `user.id`
- `gift.contact_id` → `contact.id`
- `debt.owner_id` → `user.id`
- `debt.contact_id` → `contact.id`
- `webhook_endpoint.owner_id` → `user.id`

---

## Cascade Behavior

**When a contact is deleted:**
- All associated `contact_tag` entries are deleted
- All associated `contact_group` entries are deleted
- All `contact_field` entries are deleted
- All `address` entries are deleted
- All `relationship` entries (both as contact_id and related_contact_id) are deleted
- All `pet` entries are deleted
- All `custom_field_value` entries are deleted
- All `interaction` entries are deleted
- All `note` entries are deleted
- All `reminder` entries (where contact_id = this contact) are deleted
- All `life_event` entries are deleted
- All `gift` entries are deleted
- All `debt` entries are deleted

**When a user is deleted:**
- All owned contacts, tags, groups, interactions, reminders, gifts, debts, life events, notes, journal entries, custom field definitions, and webhook endpoints are deleted
- This triggers cascading deletes on all related entities

**When a custom field definition is deleted:**
- All associated `custom_field_value` entries are deleted

**When a tag is deleted:**
- All associated `contact_tag` entries are deleted

**When a group is deleted:**
- All associated `contact_group` entries are deleted

---

## Indexing Strategy

| Table | Indexed Columns | Reason |
|-------|-----------------|--------|
| `tag` | owner_id | Filter tags by user |
| `group` | owner_id | Filter groups by user |
| `contact` | owner_id, is_archived, is_favorite, contact_frequency_days | List queries, filtering, cadence detection |
| `contact_field` | contact_id, field_type | Fetch fields by contact; filter by type |
| `address` | contact_id | Fetch addresses by contact |
| `relationship` | contact_id, related_contact_id | Fetch relationships from/to contact |
| `pet` | contact_id | Fetch pets by contact |
| `custom_field_value` | contact_id, field_definition_id | Fetch values by contact and field |
| `interaction` | contact_id, owner_id, occurred_at, channel | Last contact detection, timeline queries |
| `note` | contact_id, owner_id, created_at | Timeline, fetch by contact |
| `journal_entry` | owner_id, entry_date | Fetch entries by user and date |
| `reminder` | owner_id, contact_id, remind_at, is_active | ARQ worker: fetch upcoming reminders |
| `life_event` | contact_id, owner_id, occurred_at | Timeline, milestone tracking |
| `gift` | contact_id, owner_id, status | Fetch gifts by contact and status |
| `debt` | contact_id, owner_id, is_settled | Fetch debts by contact and settlement status |
| `webhook_endpoint` | owner_id, direction | Fetch webhooks by user and direction |

---

## Key Design Decisions

1. **UUID Primary Keys Everywhere:** Distributed ID generation, no autoincrement race conditions.

2. **Soft Delete via `is_archived`:** Contacts can be archived without cascading deletes. Historical data is preserved for reporting.

3. **vCard Round-Trip Fidelity:** `vcard_raw` and `vcard_etag` enable perfect sync with iOS contacts via CardDAV (Radicale), preserving Apple extensions.

4. **Computed `last_contacted_at`:** Auto-updated by `create_interaction()` CRUD to enable efficient "losing touch" queries.

5. **Flexible Contact Fields:** `contact_field` table with type enum supports emails, phones, URLs, social media, IM handles, and custom fields without schema bloat.

6. **Custom Fields System:** `custom_field_definition` + `custom_field_value` allows users to define arbitrary attributes (dietary restrictions, pet names, etc.) without schema changes.

7. **Directional Relationships:** `relationship` table models family/friend/work connections. Bidirectional relationships require two records.

8. **Multi-table Junction Design:** `contact_tag` and `contact_group` enable many-to-many without schema mutation.

9. **Cascade Delete Throughout:** Deleting a contact, user, or definition cascades cleanly. No orphaned records.

10. **Temporal Tracking:** All entities have `created_at` and most have `updated_at` for auditability and timeline queries.

---

## Migration Path

This schema is generated via Alembic migrations (Step 4 in HANDOFF.md). To initialize:

```bash
cd /home/will/Documents/Homelab/personal-crm/app/backend
alembic upgrade head
```

---

## Query Examples (SQLModel)

### Get a user's contacts (active, ordered by name)
```python
from sqlmodel import select
from app.models import Contact

statement = select(Contact).where(
    Contact.owner_id == user_id,
    Contact.is_archived == False
).order_by(Contact.first_name, Contact.last_name)
contacts = session.exec(statement).all()
```

### Find contacts not contacted in 30+ days (cadence check)
```python
from datetime import datetime, timedelta, timezone
from sqlmodel import select
from app.models import Contact

cutoff = datetime.now(timezone.utc) - timedelta(days=30)
statement = select(Contact).where(
    Contact.owner_id == user_id,
    Contact.is_archived == False,
    Contact.contact_frequency_days >= 30,
    Contact.last_contacted_at < cutoff
)
overdue = session.exec(statement).all()
```

### Get all interactions with a contact (timeline)
```python
from sqlmodel import select
from app.models import Interaction

statement = select(Interaction).where(
    Interaction.contact_id == contact_id
).order_by(Interaction.occurred_at.desc())
interactions = session.exec(statement).all()
```

### Find upcoming reminders (for ARQ worker)
```python
from datetime import datetime, timezone
from sqlmodel import select
from app.models import Reminder

now = datetime.now(timezone.utc)
statement = select(Reminder).where(
    Reminder.is_active == True,
    Reminder.snoozed_until == None,
    Reminder.remind_at <= now
)
due = session.exec(statement).all()
```

---

**Version:** 1.0
**Last Updated:** 2026-03-29
**Status:** Phase 1 Complete (Models defined)
