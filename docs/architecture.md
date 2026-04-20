# Personal CRM — Haiku Implementation Handoff

> Prescriptive, step-by-step implementation plan. Each task has exact file paths,
> exact code, and a verification check. Execute tasks in order. Do not skip steps.
> Do not deviate from the prescribed structure unless a verification check fails.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Step 0: Clone Template and Verify](#step-0-clone-template-and-verify)
- [Step 1: Backend Models](#step-1-backend-models)
- [Step 2: Backend CRUD](#step-2-backend-crud)
- [Step 3: Backend API Routes](#step-3-backend-api-routes)
- [Step 4: Alembic Migrations](#step-4-alembic-migrations)
- [Step 5: vCard Utilities](#step-5-vcard-utilities)
- [Step 6: Radicale CardDAV Integration](#step-6-radicale-carddav-integration)
- [Step 7: Import Pipeline](#step-7-import-pipeline)
- [Step 8: Frontend — Contact List](#step-8-frontend--contact-list)
- [Step 9: Frontend — Contact Detail](#step-9-frontend--contact-detail)
- [Step 10: Frontend — Contact Create/Edit](#step-10-frontend--contact-createedit)
- [Step 11: Frontend — Tags, Groups, Relationships](#step-11-frontend--tags-groups-relationships)
- [Step 12: Frontend — Navigation and Dashboard](#step-12-frontend--navigation-and-dashboard)
- [Step 13: Docker Compose and Deployment](#step-13-docker-compose-and-deployment)
- [Step 14: Phase 2 — Interactions and Timeline](#step-14-phase-2--interactions-and-timeline)
- [Step 15: Phase 2 — Reminders and Smart Cadences](#step-15-phase-2--reminders-and-smart-cadences)
- [Step 16: Phase 2 — ARQ Worker and Apprise Notifications](#step-16-phase-2--arq-worker-and-apprise-notifications)
- [Step 17: Phase 2 — Gifts and Debts](#step-17-phase-2--gifts-and-debts)
- [Step 18: Phase 2 — Dashboard](#step-18-phase-2--dashboard)
- [Step 19: Phase 3 — Webhook API](#step-19-phase-3--webhook-api)
- [Step 20: Phase 3 — Meilisearch Integration](#step-20-phase-3--meilisearch-integration)

---

## Conventions

### Naming

- All table models use `SQLModel` with `table=True`.
- Schema models (no `table=True`) are named `{Entity}Create`, `{Entity}Update`, `{Entity}Public`, `{Entity}sPublic` (plural for list responses).
- All primary keys are `uuid.UUID` using `sa_column=Column(pg.UUID, primary_key=True, default=uuid.uuid4)`.
- All tables have `created_at: datetime` and `updated_at: datetime` columns.
- API routes are under `/api/v1/` and use tags matching the router filename.

### Template Patterns (Do Not Deviate)

The FastAPI full-stack template uses these exact patterns. Match them:

- **Models**: All models live in `backend/app/models.py`. Base model → Create model → Update model → Table model → Public model → List model.
- **CRUD**: All database operations live in `backend/app/crud.py` as standalone functions.
- **Routes**: Each resource gets its own file in `backend/app/api/routes/`. Use `SessionDep` and `CurrentUser` from `deps.py`.
- **Frontend**: Each resource gets a directory in `frontend/src/components/`. Route pages in `frontend/src/routes/_layout/`.
- **API client**: Auto-generated. After any backend model/route change, run `scripts/generate-client.sh`.

### Verification Checks

Every step ends with a `### Check` section. Run all commands listed. If any fail, fix the issue before proceeding.

---

## Prerequisites

These must be true before starting:

1. `git`, `docker`, `docker compose` are installed.
2. Python 3.10+ with `uv` installed (`curl -LsSf https://astral.sh/uv/install.sh | sh`).
3. `bun` installed (`curl -fsSL https://bun.sh/install | bash`).
4. The target directory is `/home/will/Documents/Homelab/personal-crm/app/` (the actual application code; `/home/will/Documents/Homelab/personal-crm/` contains this plan).

---

## Step 0: Clone Template and Verify

### Actions

```bash
cd /home/will/Documents/Homelab/personal-crm
git clone https://github.com/fastapi/full-stack-fastapi-template.git app
cd app
```

### Check

```bash
# All of these files must exist:
test -f app/backend/app/models.py && echo "OK: models.py" || echo "FAIL: models.py missing"
test -f app/backend/app/crud.py && echo "OK: crud.py" || echo "FAIL: crud.py missing"
test -f app/backend/app/api/routes/items.py && echo "OK: items.py" || echo "FAIL: items.py missing"
test -f app/frontend/package.json && echo "OK: package.json" || echo "FAIL: package.json missing"
test -f app/compose.yml && echo "OK: compose.yml" || echo "FAIL: compose.yml missing"
```

---

## Step 1: Backend Models

### Context

The template has `User` and `Item` models in `backend/app/models.py`. We keep `User` and all its related models untouched. We **replace** `Item` and all Item-related models with our CRM domain models.

### File: `backend/app/models.py`

**Remove** these classes (and only these): `ItemBase`, `ItemCreate`, `ItemUpdate`, `Item`, `ItemPublic`, `ItemsPublic`.

**Add** the following classes. Place them after the User-related classes and before `Message`, `Token`, `TokenPayload`, `NewPassword`.

```python
import enum
from datetime import date

# ─── Enums ────────────────────────────────────────────────────────────────────

class ContactFieldType(str, enum.Enum):
    EMAIL = "email"
    PHONE = "phone"
    URL = "url"
    SOCIAL = "social"
    IM = "im"
    CUSTOM = "custom"

class GiftStatus(str, enum.Enum):
    IDEA = "idea"
    GIVEN = "given"
    RECEIVED = "received"

class InteractionChannel(str, enum.Enum):
    CALL = "call"
    IN_PERSON = "in_person"
    TEXT = "text"
    EMAIL = "email"
    VIDEO = "video"
    SOCIAL = "social"
    OTHER = "other"

class ReminderFrequency(str, enum.Enum):
    ONCE = "once"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"

class DebtDirection(str, enum.Enum):
    I_OWE = "i_owe"
    THEY_OWE = "they_owe"


# ─── Tag ──────────────────────────────────────────────────────────────────────

class TagBase(SQLModel):
    name: str = Field(min_length=1, max_length=100)
    color: str | None = Field(default=None, max_length=7)  # hex color e.g. #ff0000

class TagCreate(TagBase):
    pass

class TagUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    color: str | None = None

class Tag(TagBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", nullable=False, ondelete="CASCADE")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), nullable=False)

class TagPublic(TagBase):
    id: uuid.UUID
    created_at: datetime

class TagsPublic(SQLModel):
    data: list[TagPublic]
    count: int


# ─── ContactTag (junction) ───────────────────────────────────────────────────

class ContactTag(SQLModel, table=True):
    contact_id: uuid.UUID = Field(foreign_key="contact.id", primary_key=True, ondelete="CASCADE")
    tag_id: uuid.UUID = Field(foreign_key="tag.id", primary_key=True, ondelete="CASCADE")


# ─── Group ────────────────────────────────────────────────────────────────────

class GroupBase(SQLModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=1000)

class GroupCreate(GroupBase):
    pass

class GroupUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None

class Group(GroupBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", nullable=False, ondelete="CASCADE")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), nullable=False)

class GroupPublic(GroupBase):
    id: uuid.UUID
    created_at: datetime

class GroupsPublic(SQLModel):
    data: list[GroupPublic]
    count: int


# ─── ContactGroup (junction) ─────────────────────────────────────────────────

class ContactGroup(SQLModel, table=True):
    contact_id: uuid.UUID = Field(foreign_key="contact.id", primary_key=True, ondelete="CASCADE")
    group_id: uuid.UUID = Field(foreign_key="group.id", primary_key=True, ondelete="CASCADE")


# ─── Contact ─────────────────────────────────────────────────────────────────

class ContactBase(SQLModel):
    first_name: str = Field(min_length=1, max_length=255)
    last_name: str | None = Field(default=None, max_length=255)
    middle_name: str | None = Field(default=None, max_length=255)
    prefix: str | None = Field(default=None, max_length=50)
    suffix: str | None = Field(default=None, max_length=50)
    nickname: str | None = Field(default=None, max_length=255)
    company: str | None = Field(default=None, max_length=255)
    department: str | None = Field(default=None, max_length=255)
    title: str | None = Field(default=None, max_length=255)
    birthday: date | None = None
    notes: str | None = Field(default=None, max_length=10000)
    how_we_met: str | None = Field(default=None, max_length=2000)
    is_favorite: bool = False
    is_archived: bool = False
    is_deceased: bool = False
    deceased_at: date | None = None
    contact_frequency_days: int | None = Field(default=None, ge=1, le=3650)
    # Kanban stage for relationship tracking
    stage: str | None = Field(default=None, max_length=100)

class ContactCreate(ContactBase):
    tag_ids: list[uuid.UUID] | None = None
    group_ids: list[uuid.UUID] | None = None

class ContactUpdate(SQLModel):
    first_name: str | None = Field(default=None, min_length=1, max_length=255)
    last_name: str | None = None
    middle_name: str | None = None
    prefix: str | None = None
    suffix: str | None = None
    nickname: str | None = None
    company: str | None = None
    department: str | None = None
    title: str | None = None
    birthday: date | None = None
    notes: str | None = None
    how_we_met: str | None = None
    is_favorite: bool | None = None
    is_archived: bool | None = None
    is_deceased: bool | None = None
    deceased_at: date | None = None
    contact_frequency_days: int | None = None
    stage: str | None = None
    tag_ids: list[uuid.UUID] | None = None
    group_ids: list[uuid.UUID] | None = None

class Contact(ContactBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", nullable=False, ondelete="CASCADE")
    # Raw vCard text for CardDAV round-trip fidelity
    vcard_raw: str | None = Field(default=None)
    vcard_etag: str | None = Field(default=None, max_length=255)
    # Avatar stored as file path or URL
    avatar_url: str | None = Field(default=None, max_length=2048)
    # Computed: last time any interaction was logged with this contact
    last_contacted_at: datetime | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column_kwargs={"onupdate": lambda: datetime.now(timezone.utc)},
        nullable=False,
    )

class ContactPublic(ContactBase):
    id: uuid.UUID
    avatar_url: str | None
    last_contacted_at: datetime | None
    created_at: datetime
    updated_at: datetime
    tags: list[TagPublic] = []
    groups: list[GroupPublic] = []

class ContactsPublic(SQLModel):
    data: list[ContactPublic]
    count: int


# ─── ContactField ────────────────────────────────────────────────────────────

class ContactFieldBase(SQLModel):
    field_type: ContactFieldType
    label: str = Field(max_length=100)  # e.g. "home", "work", "cell", "twitter"
    value: str = Field(min_length=1, max_length=2048)
    is_primary: bool = False
    sort_order: int = 0

class ContactFieldCreate(ContactFieldBase):
    contact_id: uuid.UUID

class ContactFieldUpdate(SQLModel):
    field_type: ContactFieldType | None = None
    label: str | None = None
    value: str | None = None
    is_primary: bool | None = None
    sort_order: int | None = None

class ContactField(ContactFieldBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    contact_id: uuid.UUID = Field(foreign_key="contact.id", nullable=False, ondelete="CASCADE")

class ContactFieldPublic(ContactFieldBase):
    id: uuid.UUID
    contact_id: uuid.UUID


# ─── Address ─────────────────────────────────────────────────────────────────

class AddressBase(SQLModel):
    label: str = Field(max_length=100, default="home")  # home, work, other
    street: str | None = Field(default=None, max_length=500)
    extended: str | None = Field(default=None, max_length=500)  # apt, suite
    city: str | None = Field(default=None, max_length=255)
    region: str | None = Field(default=None, max_length=255)  # state/province
    postal_code: str | None = Field(default=None, max_length=50)
    country: str | None = Field(default=None, max_length=255)
    latitude: float | None = None
    longitude: float | None = None

class AddressCreate(AddressBase):
    contact_id: uuid.UUID

class AddressUpdate(SQLModel):
    label: str | None = None
    street: str | None = None
    extended: str | None = None
    city: str | None = None
    region: str | None = None
    postal_code: str | None = None
    country: str | None = None
    latitude: float | None = None
    longitude: float | None = None

class Address(AddressBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    contact_id: uuid.UUID = Field(foreign_key="contact.id", nullable=False, ondelete="CASCADE")

class AddressPublic(AddressBase):
    id: uuid.UUID
    contact_id: uuid.UUID


# ─── Relationship ────────────────────────────────────────────────────────────

class RelationshipBase(SQLModel):
    relationship_type: str = Field(max_length=100)  # spouse, child, parent, friend, colleague, etc.
    notes: str | None = Field(default=None, max_length=1000)

class RelationshipCreate(RelationshipBase):
    contact_id: uuid.UUID       # "from" contact
    related_contact_id: uuid.UUID  # "to" contact

class RelationshipUpdate(SQLModel):
    relationship_type: str | None = None
    notes: str | None = None

class Relationship(RelationshipBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    contact_id: uuid.UUID = Field(foreign_key="contact.id", nullable=False, ondelete="CASCADE")
    related_contact_id: uuid.UUID = Field(foreign_key="contact.id", nullable=False, ondelete="CASCADE")

class RelationshipPublic(RelationshipBase):
    id: uuid.UUID
    contact_id: uuid.UUID
    related_contact_id: uuid.UUID


# ─── Pet ──────────────────────────────────────────────────────────────────────

class PetBase(SQLModel):
    name: str = Field(min_length=1, max_length=255)
    species: str | None = Field(default=None, max_length=100)  # dog, cat, etc.
    breed: str | None = Field(default=None, max_length=100)
    notes: str | None = Field(default=None, max_length=1000)

class PetCreate(PetBase):
    contact_id: uuid.UUID

class PetUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    species: str | None = None
    breed: str | None = None
    notes: str | None = None

class Pet(PetBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    contact_id: uuid.UUID = Field(foreign_key="contact.id", nullable=False, ondelete="CASCADE")

class PetPublic(PetBase):
    id: uuid.UUID
    contact_id: uuid.UUID


# ─── CustomFieldDefinition ───────────────────────────────────────────────────

class CustomFieldDefinitionBase(SQLModel):
    """Defines a custom field type that can be attached to any contact.
    Example: name="Dietary Restrictions", field_type="text"
    Example: name="Preferred Filament", field_type="text"
    """
    name: str = Field(min_length=1, max_length=255)
    field_type: str = Field(max_length=50, default="text")  # text, number, date, boolean, select
    description: str | None = Field(default=None, max_length=500)
    # For "select" type: comma-separated options
    options: str | None = Field(default=None, max_length=2000)
    icon: str | None = Field(default=None, max_length=50)

class CustomFieldDefinitionCreate(CustomFieldDefinitionBase):
    pass

class CustomFieldDefinitionUpdate(SQLModel):
    name: str | None = None
    field_type: str | None = None
    description: str | None = None
    options: str | None = None
    icon: str | None = None

class CustomFieldDefinition(CustomFieldDefinitionBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", nullable=False, ondelete="CASCADE")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), nullable=False)

class CustomFieldDefinitionPublic(CustomFieldDefinitionBase):
    id: uuid.UUID
    created_at: datetime


# ─── CustomFieldValue ────────────────────────────────────────────────────────

class CustomFieldValueBase(SQLModel):
    value: str = Field(max_length=5000)

class CustomFieldValueCreate(CustomFieldValueBase):
    contact_id: uuid.UUID
    field_definition_id: uuid.UUID

class CustomFieldValueUpdate(SQLModel):
    value: str | None = None

class CustomFieldValue(CustomFieldValueBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    contact_id: uuid.UUID = Field(foreign_key="contact.id", nullable=False, ondelete="CASCADE")
    field_definition_id: uuid.UUID = Field(
        foreign_key="customfielddefinition.id", nullable=False, ondelete="CASCADE"
    )

class CustomFieldValuePublic(CustomFieldValueBase):
    id: uuid.UUID
    contact_id: uuid.UUID
    field_definition_id: uuid.UUID
    field_name: str | None = None  # populated from join


# ─── Interaction ──────────────────────────────────────────────────────────────

class InteractionBase(SQLModel):
    channel: InteractionChannel
    occurred_at: datetime
    notes: str | None = Field(default=None, max_length=10000)
    mood: str | None = Field(default=None, max_length=50)  # emoji or keyword
    duration_minutes: int | None = Field(default=None, ge=0)

class InteractionCreate(InteractionBase):
    contact_id: uuid.UUID

class InteractionUpdate(SQLModel):
    channel: InteractionChannel | None = None
    occurred_at: datetime | None = None
    notes: str | None = None
    mood: str | None = None
    duration_minutes: int | None = None

class Interaction(InteractionBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    contact_id: uuid.UUID = Field(foreign_key="contact.id", nullable=False, ondelete="CASCADE")
    owner_id: uuid.UUID = Field(foreign_key="user.id", nullable=False, ondelete="CASCADE")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), nullable=False)

class InteractionPublic(InteractionBase):
    id: uuid.UUID
    contact_id: uuid.UUID
    created_at: datetime

class InteractionsPublic(SQLModel):
    data: list[InteractionPublic]
    count: int


# ─── Reminder ─────────────────────────────────────────────────────────────────

class ReminderBase(SQLModel):
    title: str = Field(min_length=1, max_length=500)
    description: str | None = Field(default=None, max_length=2000)
    remind_at: datetime
    frequency: ReminderFrequency = ReminderFrequency.ONCE
    is_active: bool = True

class ReminderCreate(ReminderBase):
    contact_id: uuid.UUID | None = None  # optional — can be standalone

class ReminderUpdate(SQLModel):
    title: str | None = None
    description: str | None = None
    remind_at: datetime | None = None
    frequency: ReminderFrequency | None = None
    is_active: bool | None = None

class Reminder(ReminderBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    contact_id: uuid.UUID | None = Field(default=None, foreign_key="contact.id", ondelete="CASCADE")
    owner_id: uuid.UUID = Field(foreign_key="user.id", nullable=False, ondelete="CASCADE")
    last_sent_at: datetime | None = None
    snoozed_until: datetime | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), nullable=False)

class ReminderPublic(ReminderBase):
    id: uuid.UUID
    contact_id: uuid.UUID | None
    last_sent_at: datetime | None
    snoozed_until: datetime | None
    created_at: datetime

class RemindersPublic(SQLModel):
    data: list[ReminderPublic]
    count: int


# ─── Gift ─────────────────────────────────────────────────────────────────────

class GiftBase(SQLModel):
    name: str = Field(min_length=1, max_length=500)
    description: str | None = Field(default=None, max_length=2000)
    status: GiftStatus = GiftStatus.IDEA
    occasion: str | None = Field(default=None, max_length=255)
    date: date | None = None
    value_amount: float | None = None
    value_currency: str = Field(default="USD", max_length=3)
    url: str | None = Field(default=None, max_length=2048)

class GiftCreate(GiftBase):
    contact_id: uuid.UUID

class GiftUpdate(SQLModel):
    name: str | None = None
    description: str | None = None
    status: GiftStatus | None = None
    occasion: str | None = None
    date: date | None = None
    value_amount: float | None = None
    value_currency: str | None = None
    url: str | None = None

class Gift(GiftBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    contact_id: uuid.UUID = Field(foreign_key="contact.id", nullable=False, ondelete="CASCADE")
    owner_id: uuid.UUID = Field(foreign_key="user.id", nullable=False, ondelete="CASCADE")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), nullable=False)

class GiftPublic(GiftBase):
    id: uuid.UUID
    contact_id: uuid.UUID
    created_at: datetime

class GiftsPublic(SQLModel):
    data: list[GiftPublic]
    count: int


# ─── Debt ─────────────────────────────────────────────────────────────────────

class DebtBase(SQLModel):
    direction: DebtDirection
    amount: float = Field(gt=0)
    currency: str = Field(default="USD", max_length=3)
    reason: str | None = Field(default=None, max_length=1000)
    is_settled: bool = False
    settled_at: date | None = None

class DebtCreate(DebtBase):
    contact_id: uuid.UUID

class DebtUpdate(SQLModel):
    direction: DebtDirection | None = None
    amount: float | None = None
    currency: str | None = None
    reason: str | None = None
    is_settled: bool | None = None
    settled_at: date | None = None

class Debt(DebtBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    contact_id: uuid.UUID = Field(foreign_key="contact.id", nullable=False, ondelete="CASCADE")
    owner_id: uuid.UUID = Field(foreign_key="user.id", nullable=False, ondelete="CASCADE")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), nullable=False)

class DebtPublic(DebtBase):
    id: uuid.UUID
    contact_id: uuid.UUID
    created_at: datetime

class DebtsPublic(SQLModel):
    data: list[DebtPublic]
    count: int


# ─── LifeEvent ────────────────────────────────────────────────────────────────

class LifeEventBase(SQLModel):
    event_type: str = Field(max_length=100)  # job_change, move, wedding, baby, graduation, etc.
    title: str = Field(min_length=1, max_length=500)
    description: str | None = Field(default=None, max_length=2000)
    occurred_at: date
    create_annual_reminder: bool = False

class LifeEventCreate(LifeEventBase):
    contact_id: uuid.UUID

class LifeEventUpdate(SQLModel):
    event_type: str | None = None
    title: str | None = None
    description: str | None = None
    occurred_at: date | None = None
    create_annual_reminder: bool | None = None

class LifeEvent(LifeEventBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    contact_id: uuid.UUID = Field(foreign_key="contact.id", nullable=False, ondelete="CASCADE")
    owner_id: uuid.UUID = Field(foreign_key="user.id", nullable=False, ondelete="CASCADE")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), nullable=False)

class LifeEventPublic(LifeEventBase):
    id: uuid.UUID
    contact_id: uuid.UUID
    created_at: datetime

class LifeEventsPublic(SQLModel):
    data: list[LifeEventPublic]
    count: int


# ─── Note (per-contact timestamped notes) ────────────────────────────────────

class NoteBase(SQLModel):
    body: str = Field(min_length=1, max_length=50000)

class NoteCreate(NoteBase):
    contact_id: uuid.UUID

class NoteUpdate(SQLModel):
    body: str | None = None

class Note(NoteBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    contact_id: uuid.UUID = Field(foreign_key="contact.id", nullable=False, ondelete="CASCADE")
    owner_id: uuid.UUID = Field(foreign_key="user.id", nullable=False, ondelete="CASCADE")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column_kwargs={"onupdate": lambda: datetime.now(timezone.utc)},
        nullable=False,
    )

class NotePublic(NoteBase):
    id: uuid.UUID
    contact_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

class NotesPublic(SQLModel):
    data: list[NotePublic]
    count: int


# ─── JournalEntry (not tied to a contact) ────────────────────────────────────

class JournalEntryBase(SQLModel):
    body: str = Field(min_length=1, max_length=50000)
    mood: str | None = Field(default=None, max_length=50)
    entry_date: date

class JournalEntryCreate(JournalEntryBase):
    pass

class JournalEntryUpdate(SQLModel):
    body: str | None = None
    mood: str | None = None
    entry_date: date | None = None

class JournalEntry(JournalEntryBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", nullable=False, ondelete="CASCADE")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column_kwargs={"onupdate": lambda: datetime.now(timezone.utc)},
        nullable=False,
    )

class JournalEntryPublic(JournalEntryBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

class JournalEntriesPublic(SQLModel):
    data: list[JournalEntryPublic]
    count: int


# ─── WebhookEndpoint (for inbound/outbound webhooks) ─────────────────────────

class WebhookEndpointBase(SQLModel):
    name: str = Field(min_length=1, max_length=255)
    url: str | None = Field(default=None, max_length=2048)  # outbound target URL
    direction: str = Field(max_length=10)  # "inbound" or "outbound"
    event_types: str | None = Field(default=None, max_length=1000)  # comma-separated
    is_active: bool = True
    secret: str | None = Field(default=None, max_length=255)  # for verifying inbound

class WebhookEndpoint(WebhookEndpointBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", nullable=False, ondelete="CASCADE")
    api_key: str = Field(max_length=255)  # for authenticating inbound webhooks
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), nullable=False)
```

### Required Imports

Add these to the top of `models.py` (merge with existing imports):

```python
import enum
from datetime import date, datetime, timezone
```

The existing imports (`import uuid`, `from sqlmodel import Field, SQLModel`) stay unchanged.

### Check

```bash
cd /home/will/Documents/Homelab/personal-crm/app/backend
uv run python -c "from app.models import Contact, ContactField, Address, Tag, Group, Relationship, Pet, CustomFieldDefinition, CustomFieldValue, Interaction, Reminder, Gift, Debt, LifeEvent, Note, JournalEntry, WebhookEndpoint; print('All models import OK')"
```

Expected output: `All models import OK`

---

## Step 2: Backend CRUD

### File: `backend/app/crud.py`

**Remove** the `create_item` function.

**Add** CRUD functions for Contact. Follow the exact pattern of the existing `create_user` function.

```python
# ─── Contact CRUD ─────────────────────────────────────────────────────────────

def create_contact(*, session: Session, contact_in: ContactCreate, owner_id: uuid.UUID) -> Contact:
    db_obj = Contact.model_validate(contact_in, update={"owner_id": owner_id})
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    # Handle tag associations
    if contact_in.tag_ids:
        for tag_id in contact_in.tag_ids:
            session.add(ContactTag(contact_id=db_obj.id, tag_id=tag_id))
        session.commit()
    # Handle group associations
    if contact_in.group_ids:
        for group_id in contact_in.group_ids:
            session.add(ContactGroup(contact_id=db_obj.id, group_id=group_id))
        session.commit()
    session.refresh(db_obj)
    return db_obj
```

Add similar functions for: `create_tag`, `create_group`, `create_contact_field`, `create_address`, `create_relationship`, `create_pet`, `create_custom_field_definition`, `create_custom_field_value`, `create_interaction`, `create_reminder`, `create_gift`, `create_debt`, `create_life_event`, `create_note`, `create_journal_entry`.

Each follows the same pattern:
1. `model_validate` from the `*Create` schema with `owner_id` added.
2. `session.add()` + `session.commit()` + `session.refresh()`.
3. Return the created object.

For `create_interaction`, also update `Contact.last_contacted_at`:
```python
def create_interaction(*, session: Session, interaction_in: InteractionCreate, owner_id: uuid.UUID) -> Interaction:
    db_obj = Interaction.model_validate(interaction_in, update={"owner_id": owner_id})
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    # Update contact's last_contacted_at
    contact = session.get(Contact, interaction_in.contact_id)
    if contact:
        contact.last_contacted_at = db_obj.occurred_at
        session.add(contact)
        session.commit()
    return db_obj
```

### Check

```bash
cd /home/will/Documents/Homelab/personal-crm/app/backend
uv run python -c "from app.crud import create_contact, create_tag, create_interaction; print('CRUD imports OK')"
```

---

## Step 3: Backend API Routes

### Overview

Create these route files in `backend/app/api/routes/`:

| File | Resource | Tag | Endpoints |
|------|----------|-----|-----------|
| `contacts.py` | Contact | contacts | list, get, create, update, delete |
| `contact_fields.py` | ContactField | contact-fields | list-by-contact, create, update, delete |
| `addresses.py` | Address | addresses | list-by-contact, create, update, delete |
| `tags.py` | Tag | tags | list, create, update, delete |
| `groups.py` | Group | groups | list, create, update, delete |
| `relationships.py` | Relationship | relationships | list-by-contact, create, update, delete |
| `pets.py` | Pet | pets | list-by-contact, create, update, delete |
| `custom_fields.py` | CustomFieldDefinition + Value | custom-fields | CRUD for both |
| `interactions.py` | Interaction | interactions | list (global + per-contact), create, update, delete |
| `reminders.py` | Reminder | reminders | list, create, update, delete, snooze |
| `gifts.py` | Gift | gifts | list-by-contact, create, update, delete |
| `debts.py` | Debt | debts | list-by-contact, create, update, delete |
| `life_events.py` | LifeEvent | life-events | list-by-contact, create, update, delete |
| `notes.py` | Note | notes | list-by-contact, create, update, delete |
| `journal.py` | JournalEntry | journal | list, create, update, delete |
| `import_export.py` | Import/Export | import-export | import-vcard, import-csv, export-json, export-vcard |
| `webhooks.py` | WebhookEndpoint + inbound | webhooks | CRUD + inbound receiver |

### Pattern: `contacts.py`

Use the template's `items.py` as a reference. Here is the exact structure for `contacts.py`:

```python
"""Contact management routes."""

import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Contact,
    ContactCreate,
    ContactPublic,
    ContactsPublic,
    ContactUpdate,
    ContactTag,
    ContactGroup,
    Tag,
    TagPublic,
    Group,
    GroupPublic,
)

router = APIRouter(prefix="/contacts", tags=["contacts"])


@router.get("/", response_model=ContactsPublic)
def list_contacts(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
    search: str | None = None,
    tag_id: uuid.UUID | None = None,
    group_id: uuid.UUID | None = None,
    is_favorite: bool | None = None,
    is_archived: bool | None = None,
    stage: str | None = None,
) -> Any:
    """List contacts with filtering."""
    # Build base query
    statement = select(Contact).where(
        Contact.owner_id == current_user.id
    )

    # Apply filters
    if is_archived is not None:
        statement = statement.where(Contact.is_archived == is_archived)
    else:
        # Default: exclude archived
        statement = statement.where(Contact.is_archived == False)

    if is_favorite is not None:
        statement = statement.where(Contact.is_favorite == is_favorite)

    if stage is not None:
        statement = statement.where(Contact.stage == stage)

    if search:
        search_filter = f"%{search}%"
        statement = statement.where(
            col(Contact.first_name).ilike(search_filter)
            | col(Contact.last_name).ilike(search_filter)
            | col(Contact.nickname).ilike(search_filter)
            | col(Contact.company).ilike(search_filter)
        )

    if tag_id:
        statement = statement.join(ContactTag).where(ContactTag.tag_id == tag_id)

    if group_id:
        statement = statement.join(ContactGroup).where(ContactGroup.group_id == group_id)

    # Count (before pagination)
    count_statement = select(func.count()).select_from(statement.subquery())
    count = session.exec(count_statement).one()

    # Apply ordering and pagination
    statement = statement.order_by(
        col(Contact.first_name).asc(), col(Contact.last_name).asc()
    ).offset(skip).limit(limit)
    contacts = session.exec(statement).all()

    # Enrich with tags and groups
    result = []
    for contact in contacts:
        # Fetch tags
        tag_statement = (
            select(Tag)
            .join(ContactTag)
            .where(ContactTag.contact_id == contact.id)
        )
        tags = session.exec(tag_statement).all()

        # Fetch groups
        group_statement = (
            select(Group)
            .join(ContactGroup)
            .where(ContactGroup.contact_id == contact.id)
        )
        groups = session.exec(group_statement).all()

        contact_data = ContactPublic.model_validate(
            contact,
            update={
                "tags": [TagPublic.model_validate(t) for t in tags],
                "groups": [GroupPublic.model_validate(g) for g in groups],
            },
        )
        result.append(contact_data)

    return ContactsPublic(data=result, count=count)


@router.get("/{contact_id}", response_model=ContactPublic)
def get_contact(
    session: SessionDep,
    current_user: CurrentUser,
    contact_id: uuid.UUID,
) -> Any:
    """Get a single contact by ID."""
    contact = session.get(Contact, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    if contact.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    # Fetch tags
    tag_statement = select(Tag).join(ContactTag).where(ContactTag.contact_id == contact.id)
    tags = session.exec(tag_statement).all()

    # Fetch groups
    group_statement = select(Group).join(ContactGroup).where(ContactGroup.contact_id == contact.id)
    groups = session.exec(group_statement).all()

    return ContactPublic.model_validate(
        contact,
        update={
            "tags": [TagPublic.model_validate(t) for t in tags],
            "groups": [GroupPublic.model_validate(g) for g in groups],
        },
    )


@router.post("/", response_model=ContactPublic)
def create_contact(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    contact_in: ContactCreate,
) -> Any:
    """Create a new contact."""
    contact = Contact.model_validate(contact_in, update={"owner_id": current_user.id})
    session.add(contact)
    session.commit()
    session.refresh(contact)

    # Handle tag associations
    if contact_in.tag_ids:
        for tag_id in contact_in.tag_ids:
            session.add(ContactTag(contact_id=contact.id, tag_id=tag_id))
        session.commit()

    # Handle group associations
    if contact_in.group_ids:
        for group_id in contact_in.group_ids:
            session.add(ContactGroup(contact_id=contact.id, group_id=group_id))
        session.commit()

    return get_contact(session=session, current_user=current_user, contact_id=contact.id)


@router.patch("/{contact_id}", response_model=ContactPublic)
def update_contact(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    contact_id: uuid.UUID,
    contact_in: ContactUpdate,
) -> Any:
    """Update a contact."""
    contact = session.get(Contact, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    if contact.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    update_data = contact_in.model_dump(exclude_unset=True)
    tag_ids = update_data.pop("tag_ids", None)
    group_ids = update_data.pop("group_ids", None)

    contact.sqlmodel_update(update_data)
    session.add(contact)
    session.commit()
    session.refresh(contact)

    # Update tag associations if provided
    if tag_ids is not None:
        # Remove existing
        existing = session.exec(
            select(ContactTag).where(ContactTag.contact_id == contact.id)
        ).all()
        for ct in existing:
            session.delete(ct)
        # Add new
        for tag_id in tag_ids:
            session.add(ContactTag(contact_id=contact.id, tag_id=tag_id))
        session.commit()

    # Update group associations if provided
    if group_ids is not None:
        existing = session.exec(
            select(ContactGroup).where(ContactGroup.contact_id == contact.id)
        ).all()
        for cg in existing:
            session.delete(cg)
        for group_id in group_ids:
            session.add(ContactGroup(contact_id=contact.id, group_id=group_id))
        session.commit()

    return get_contact(session=session, current_user=current_user, contact_id=contact.id)


@router.delete("/{contact_id}")
def delete_contact(
    session: SessionDep,
    current_user: CurrentUser,
    contact_id: uuid.UUID,
) -> Any:
    """Delete a contact."""
    contact = session.get(Contact, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    if contact.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    session.delete(contact)
    session.commit()
    return {"ok": True}
```

### Other Route Files

Each follows the same pattern as `contacts.py`. Key differences:

- **`tags.py`**: Simple CRUD, no join tables. Filter by `owner_id`.
- **`groups.py`**: Same as tags.
- **`contact_fields.py`**: All endpoints take `contact_id` as a path parameter. Verify contact ownership before operating.
- **`addresses.py`**: Same pattern as contact_fields.
- **`relationships.py`**: On create, auto-create the reverse relationship. Define a `REVERSE_MAP` dict:
  ```python
  REVERSE_MAP = {
      "parent": "child", "child": "parent",
      "spouse": "spouse", "partner": "partner",
      "sibling": "sibling",
      "grandparent": "grandchild", "grandchild": "grandparent",
      "uncle": "nephew", "aunt": "niece", "nephew": "uncle", "niece": "aunt",
      "cousin": "cousin",
      "manager": "report", "report": "manager",
      "mentor": "mentee", "mentee": "mentor",
  }
  ```
  When creating a relationship, also create the reverse if a mapping exists.
- **`interactions.py`**: Two list endpoints: `GET /interactions/` (global feed, ordered by `occurred_at desc`) and `GET /contacts/{contact_id}/interactions/` (per-contact timeline). On create, update `Contact.last_contacted_at`.
- **`reminders.py`**: Add a `POST /reminders/{id}/snooze` endpoint that sets `snoozed_until`.
- **`import_export.py`**: Accepts multipart file upload for vCard and CSV. See Step 7 for details.
- **`webhooks.py`**: Inbound endpoint at `POST /webhooks/inbound/{api_key}` — no auth required (key in URL). Creates an Interaction from the payload.

### Register Routes

**File: `backend/app/api/main.py`**

Replace the `items` router include with all CRM routers:

```python
from app.api.routes import (
    contacts,
    contact_fields,
    addresses,
    tags,
    groups,
    relationships,
    pets,
    custom_fields,
    interactions,
    reminders,
    gifts,
    debts,
    life_events,
    notes,
    journal,
    import_export,
    webhooks,
    login,
    users,
    utils,
)

api_router = APIRouter()
api_router.include_router(login.router)
api_router.include_router(users.router)
api_router.include_router(utils.router)
api_router.include_router(contacts.router)
api_router.include_router(contact_fields.router)
api_router.include_router(addresses.router)
api_router.include_router(tags.router)
api_router.include_router(groups.router)
api_router.include_router(relationships.router)
api_router.include_router(pets.router)
api_router.include_router(custom_fields.router)
api_router.include_router(interactions.router)
api_router.include_router(reminders.router)
api_router.include_router(gifts.router)
api_router.include_router(debts.router)
api_router.include_router(life_events.router)
api_router.include_router(notes.router)
api_router.include_router(journal.router)
api_router.include_router(import_export.router)
api_router.include_router(webhooks.router)
```

### Check

```bash
cd /home/will/Documents/Homelab/personal-crm/app/backend
uv run python -c "
from app.api.main import api_router
routes = [r.path for r in api_router.routes]
assert '/contacts/' in routes or any('/contacts' in r for r in routes), 'contacts route missing'
print(f'OK: {len(routes)} routes registered')
for r in sorted(routes):
    print(f'  {r}')
"
```

---

## Step 4: Alembic Migrations

### Actions

Delete existing migration files (they reference the Item table we removed):

```bash
cd /home/will/Documents/Homelab/personal-crm/app/backend
rm -f app/alembic/versions/*.py
```

Create a fresh initial migration:

```bash
uv run alembic revision --autogenerate -m "initial CRM models"
```

### Check

```bash
# The generated migration file should exist and reference our tables
ls app/alembic/versions/*.py | head -1
uv run python -c "
import importlib, glob, os
files = glob.glob('app/alembic/versions/*.py')
assert len(files) >= 1, 'No migration files found'
# Read the file and check it mentions our tables
with open(files[0]) as f:
    content = f.read()
for table in ['contact', 'tag', 'contactfield', 'address', 'relationship', 'interaction', 'reminder']:
    assert table in content.lower(), f'Table {table} not found in migration'
print('OK: Migration file contains all expected tables')
"
```

---

## Step 5: vCard Utilities

### File: `backend/app/vcard.py` (NEW FILE)

This module handles conversion between our Contact model and vCard 3.0 format.

### Dependencies

Add to `backend/pyproject.toml` under `[project] dependencies`:

```
"vobject>=0.9.9",
```

Then run: `cd backend && uv sync`

### Implementation

```python
"""vCard 3.0 parsing and generation utilities.

Converts between Contact/ContactField/Address database models and vCard format.
Preserves unknown vCard properties through round-trips by storing raw vCard text.
"""

import uuid
from datetime import datetime, timezone

import vobject
from vobject.vcard import Name, Address as VCardAddress

from app.models import (
    Contact,
    ContactField,
    ContactFieldType,
    Address,
)


def contact_to_vcard(
    contact: Contact,
    fields: list[ContactField],
    addresses: list[Address],
) -> str:
    """Generate a vCard 3.0 string from a Contact and its related data.

    If contact.vcard_raw exists, parse it and update fields (preserving
    unknown Apple extensions). Otherwise, create a new vCard from scratch.
    """
    if contact.vcard_raw:
        try:
            card = vobject.readOne(contact.vcard_raw)
        except Exception:
            card = vobject.vCard()
    else:
        card = vobject.vCard()

    # N (structured name) — required
    card.add("n") if not hasattr(card, "n") else None
    card.n.value = Name(
        family=contact.last_name or "",
        given=contact.first_name or "",
        additional=contact.middle_name or "",
        prefix=contact.prefix or "",
        suffix=contact.suffix or "",
    )

    # FN (formatted name) — required
    fn_parts = [contact.prefix, contact.first_name, contact.middle_name, contact.last_name, contact.suffix]
    fn = " ".join(p for p in fn_parts if p).strip()
    if hasattr(card, "fn"):
        card.fn.value = fn
    else:
        card.add("fn").value = fn

    # ORG
    if contact.company:
        org_value = [contact.company]
        if contact.department:
            org_value.append(contact.department)
        if hasattr(card, "org"):
            card.org.value = org_value
        else:
            card.add("org").value = org_value
    elif hasattr(card, "org"):
        card.remove(card.org)

    # TITLE
    if contact.title:
        if hasattr(card, "title"):
            card.title.value = contact.title
        else:
            card.add("title").value = contact.title
    elif hasattr(card, "title"):
        card.remove(card.title)

    # BDAY
    if contact.birthday:
        bday_str = contact.birthday.isoformat()
        if hasattr(card, "bday"):
            card.bday.value = bday_str
        else:
            card.add("bday").value = bday_str
    elif hasattr(card, "bday"):
        card.remove(card.bday)

    # NOTE
    if contact.notes:
        if hasattr(card, "note"):
            card.note.value = contact.notes
        else:
            card.add("note").value = contact.notes
    elif hasattr(card, "note"):
        card.remove(card.note)

    # UID
    uid_str = str(contact.id)
    if hasattr(card, "uid"):
        card.uid.value = uid_str
    else:
        card.add("uid").value = uid_str

    # REV
    rev_str = contact.updated_at.strftime("%Y-%m-%dT%H:%M:%SZ")
    if hasattr(card, "rev"):
        card.rev.value = rev_str
    else:
        card.add("rev").value = rev_str

    # ─── Multi-value fields: TEL, EMAIL, URL ──────────────────────────────
    # Remove existing TEL, EMAIL, URL entries (we regenerate from DB)
    for prop_name in ("tel", "email", "url"):
        if prop_name in card.contents:
            for entry in list(card.contents[prop_name]):
                card.remove(entry)

    for field in fields:
        if field.field_type == ContactFieldType.PHONE:
            tel = card.add("tel")
            tel.value = field.value
            tel.params["TYPE"] = [field.label.upper()]
        elif field.field_type == ContactFieldType.EMAIL:
            email = card.add("email")
            email.value = field.value
            email.params["TYPE"] = [field.label.upper()]
        elif field.field_type == ContactFieldType.URL:
            url = card.add("url")
            url.value = field.value
        elif field.field_type == ContactFieldType.SOCIAL:
            social = card.add("x-socialprofile")
            social.value = field.value
            social.params["TYPE"] = [field.label]

    # ─── Addresses ────────────────────────────────────────────────────────
    if "adr" in card.contents:
        for entry in list(card.contents["adr"]):
            card.remove(entry)

    for addr in addresses:
        adr = card.add("adr")
        adr.value = VCardAddress(
            box="",
            extended=addr.extended or "",
            street=addr.street or "",
            city=addr.city or "",
            region=addr.region or "",
            code=addr.postal_code or "",
            country=addr.country or "",
        )
        adr.params["TYPE"] = [addr.label.upper()]

    return card.serialize()


def vcard_to_contact_data(vcard_text: str) -> dict:
    """Parse a vCard string and return a dict of Contact fields + related data.

    Returns:
        {
            "contact": { ... ContactCreate-compatible dict ... },
            "fields": [ { ... ContactFieldCreate-compatible dicts ... } ],
            "addresses": [ { ... AddressCreate-compatible dicts ... } ],
            "vcard_raw": "original vcard text",
        }
    """
    card = vobject.readOne(vcard_text)

    contact = {}

    # N
    if hasattr(card, "n"):
        contact["first_name"] = card.n.value.given or ""
        contact["last_name"] = card.n.value.family or None
        contact["middle_name"] = card.n.value.additional or None
        contact["prefix"] = card.n.value.prefix or None
        contact["suffix"] = card.n.value.suffix or None
    elif hasattr(card, "fn"):
        # Fallback: use FN as first_name
        contact["first_name"] = card.fn.value
    else:
        contact["first_name"] = "Unknown"

    # ORG
    if hasattr(card, "org"):
        org = card.org.value
        contact["company"] = org[0] if len(org) > 0 else None
        contact["department"] = org[1] if len(org) > 1 else None

    # TITLE
    if hasattr(card, "title"):
        contact["title"] = card.title.value

    # BDAY
    if hasattr(card, "bday"):
        try:
            from dateutil.parser import parse as dateparse
            contact["birthday"] = dateparse(card.bday.value).date()
        except Exception:
            pass

    # NOTE
    if hasattr(card, "note"):
        contact["notes"] = card.note.value

    # NICKNAME
    if hasattr(card, "nickname"):
        contact["nickname"] = card.nickname.value

    # UID — use as contact ID if it's a valid UUID
    uid = None
    if hasattr(card, "uid"):
        uid_val = card.uid.value
        try:
            uid = uuid.UUID(uid_val.replace("urn:uuid:", ""))
        except ValueError:
            pass

    # ─── Contact fields ───────────────────────────────────────────────────
    fields = []

    # TEL
    for tel in getattr(card, "tel_list", []):
        types = tel.params.get("TYPE", ["other"])
        label = types[0].lower() if types else "other"
        fields.append({
            "field_type": "phone",
            "label": label,
            "value": tel.value,
            "is_primary": "pref" in [t.lower() for t in types],
        })

    # EMAIL
    for email in getattr(card, "email_list", []):
        types = email.params.get("TYPE", ["other"])
        label = types[0].lower() if types else "other"
        fields.append({
            "field_type": "email",
            "label": label,
            "value": email.value,
            "is_primary": "pref" in [t.lower() for t in types],
        })

    # URL
    for url in getattr(card, "url_list", []):
        fields.append({
            "field_type": "url",
            "label": "website",
            "value": url.value,
        })

    # X-SOCIALPROFILE
    for social in card.contents.get("x-socialprofile", []):
        types = social.params.get("TYPE", ["other"])
        label = types[0].lower() if types else "other"
        fields.append({
            "field_type": "social",
            "label": label,
            "value": social.value,
        })

    # ─── Addresses ────────────────────────────────────────────────────────
    addresses = []
    for adr in getattr(card, "adr_list", []):
        types = adr.params.get("TYPE", ["home"])
        label = types[0].lower() if types else "home"
        addresses.append({
            "label": label,
            "street": adr.value.street or None,
            "extended": adr.value.extended or None,
            "city": adr.value.city or None,
            "region": adr.value.region or None,
            "postal_code": adr.value.code or None,
            "country": adr.value.country or None,
        })

    return {
        "contact": contact,
        "fields": fields,
        "addresses": addresses,
        "vcard_raw": vcard_text,
        "uid": uid,
    }
```

### Check

```bash
cd /home/will/Documents/Homelab/personal-crm/app/backend
uv run python -c "
from app.vcard import contact_to_vcard, vcard_to_contact_data

# Test parsing
test_vcard = '''BEGIN:VCARD
VERSION:3.0
N:Doe;John;;;
FN:John Doe
TEL;type=CELL:+1-555-123-4567
EMAIL;type=WORK:john@example.com
ORG:Acme Corp;Engineering
TITLE:Engineer
BDAY:1990-05-15
UID:550e8400-e29b-41d4-a716-446655440000
END:VCARD'''

result = vcard_to_contact_data(test_vcard)
assert result['contact']['first_name'] == 'John', f'Expected John, got {result[\"contact\"][\"first_name\"]}'
assert result['contact']['last_name'] == 'Doe'
assert result['contact']['company'] == 'Acme Corp'
assert len(result['fields']) == 2  # phone + email
print('OK: vCard parsing works correctly')
"
```

---

## Step 6: Radicale CardDAV Integration

### Dependencies

Add to `backend/pyproject.toml`:

```
"radicale>=3.6.1",
```

Run: `cd backend && uv sync`

### File: `backend/app/carddav/__init__.py` (NEW DIRECTORY + FILE)

```bash
mkdir -p backend/app/carddav
```

### File: `backend/app/carddav/storage.py` (NEW FILE)

This is the custom Radicale storage plugin that reads/writes to PostgreSQL.

```python
"""Radicale storage plugin backed by the CRM's PostgreSQL database.

This module exposes a `Storage` class that Radicale loads via config.
It reads/writes contacts from the same database as the FastAPI app.
"""

import hashlib
import contextlib
from datetime import datetime, timezone
from email.utils import formatdate
from time import mktime
from typing import Iterable, Iterator, Mapping, Optional, Set, Tuple

from radicale import item as radicale_item
from radicale import storage, types as radicale_types
from radicale.storage import BaseCollection, BaseStorage
from sqlmodel import Session, create_engine, select

from app.core.config import settings
from app.models import Contact, User


def _http_datetime(dt: datetime) -> str:
    """Format a datetime as an HTTP-date string."""
    stamp = mktime(dt.timetuple())
    return formatdate(timeval=stamp, localtime=False, usegmt=True)


class Collection(BaseCollection):
    """Represents a single CardDAV address book backed by a user's contacts."""

    def __init__(self, storage_ref: "Storage", path: str, user: str, **kwargs):
        self._storage = storage_ref
        self._path = path
        self._user = user
        self._meta: dict[str, str] = {}

    @property
    def path(self) -> str:
        return self._path

    @property
    def last_modified(self) -> str:
        return _http_datetime(datetime.now(timezone.utc))

    def get_multi(self, hrefs: Iterable[str]) -> Iterable[Tuple[str, Optional[radicale_item.Item]]]:
        with self._storage.get_session() as session:
            user = session.exec(
                select(User).where(User.email == self._user)
            ).first()
            if not user:
                return

            for href in hrefs:
                # href format: "{uuid}.vcf"
                uid_str = href.replace(".vcf", "")
                try:
                    import uuid
                    uid = uuid.UUID(uid_str)
                except ValueError:
                    yield (href, None)
                    continue

                contact = session.exec(
                    select(Contact).where(
                        Contact.id == uid,
                        Contact.owner_id == user.id,
                    )
                ).first()

                if contact and contact.vcard_raw:
                    item = radicale_item.Item(
                        collection_path=self._path,
                        text=contact.vcard_raw,
                        href=href,
                        uid=str(contact.id),
                    )
                    yield (href, item)
                else:
                    yield (href, None)

    def get_all(self) -> Iterable[radicale_item.Item]:
        with self._storage.get_session() as session:
            user = session.exec(
                select(User).where(User.email == self._user)
            ).first()
            if not user:
                return

            contacts = session.exec(
                select(Contact).where(
                    Contact.owner_id == user.id,
                    Contact.vcard_raw.is_not(None),
                )
            ).all()

            for contact in contacts:
                yield radicale_item.Item(
                    collection_path=self._path,
                    text=contact.vcard_raw,
                    href=f"{contact.id}.vcf",
                    uid=str(contact.id),
                )

    def upload(
        self, href: str, item: radicale_item.Item
    ) -> Tuple[radicale_item.Item, Optional[radicale_item.Item]]:
        """Store or update a vCard from an iOS/macOS client."""
        from app.vcard import vcard_to_contact_data

        vcard_text = item.serialize()
        parsed = vcard_to_contact_data(vcard_text)

        with self._storage.get_session() as session:
            user = session.exec(
                select(User).where(User.email == self._user)
            ).first()
            if not user:
                raise ValueError(f"User {self._user} not found")

            # Check if contact exists
            uid_str = href.replace(".vcf", "")
            old_item = None
            try:
                import uuid as uuid_mod
                uid = uuid_mod.UUID(uid_str)
                existing = session.exec(
                    select(Contact).where(
                        Contact.id == uid,
                        Contact.owner_id == user.id,
                    )
                ).first()
            except ValueError:
                existing = None

            if existing:
                # Update existing contact
                if existing.vcard_raw:
                    old_item = radicale_item.Item(
                        collection_path=self._path,
                        text=existing.vcard_raw,
                        href=href,
                    )
                # Update fields from parsed vCard
                contact_data = parsed["contact"]
                for key, value in contact_data.items():
                    if hasattr(existing, key):
                        setattr(existing, key, value)
                existing.vcard_raw = vcard_text
                existing.vcard_etag = item.etag
                session.add(existing)
            else:
                # Create new contact
                contact_data = parsed["contact"]
                new_contact = Contact(
                    owner_id=user.id,
                    vcard_raw=vcard_text,
                    vcard_etag=item.etag,
                    **contact_data,
                )
                if parsed.get("uid"):
                    new_contact.id = parsed["uid"]
                session.add(new_contact)

            session.commit()

        new_item = radicale_item.Item(
            collection_path=self._path,
            text=vcard_text,
            href=href,
        )
        return (new_item, old_item)

    def delete(self, href: Optional[str] = None) -> None:
        if href is None:
            return  # Don't allow deleting the entire collection

        with self._storage.get_session() as session:
            user = session.exec(
                select(User).where(User.email == self._user)
            ).first()
            if not user:
                return

            uid_str = href.replace(".vcf", "")
            try:
                import uuid
                uid = uuid.UUID(uid_str)
            except ValueError:
                return

            contact = session.exec(
                select(Contact).where(
                    Contact.id == uid,
                    Contact.owner_id == user.id,
                )
            ).first()
            if contact:
                session.delete(contact)
                session.commit()

    def get_meta(self, key: Optional[str] = None):
        meta = {
            "tag": "VADDRESSBOOK",
            "D:displayname": "Contacts",
            "CR:addressbook-description": "Personal CRM Contacts",
        }
        meta.update(self._meta)
        if key is None:
            return meta
        return meta.get(key)

    def set_meta(self, props: Mapping[str, str]) -> None:
        self._meta.update(props)


class Storage(BaseStorage):
    """Radicale storage backend using the CRM PostgreSQL database."""

    def __init__(self, configuration):
        super().__init__(configuration)
        self._engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))

    @contextlib.contextmanager
    def get_session(self):
        with Session(self._engine) as session:
            yield session

    def discover(
        self,
        path: str,
        depth: str = "0",
        child_context_manager=None,
        user_groups: Set[str] = set(),
    ) -> Iterable[radicale_types.CollectionOrItem]:
        sane_path = path.strip("/")
        parts = sane_path.split("/") if sane_path else []

        if child_context_manager is None:
            child_context_manager = contextlib.contextmanager(lambda p, h: (yield))

        if len(parts) == 0:
            # Root
            yield Collection(self, "", "", tag="")
        elif len(parts) == 1:
            # User principal: e.g., "user@example.com"
            user = parts[0]
            col = Collection(self, sane_path, user)
            yield col
            if depth != "0":
                # Yield the address book
                ab = Collection(self, f"{user}/contacts", user)
                with child_context_manager(f"{user}/contacts", None):
                    yield ab
        elif len(parts) == 2:
            # Address book: e.g., "user@example.com/contacts"
            user = parts[0]
            col = Collection(self, sane_path, user)
            yield col
            if depth != "0":
                # Yield all items
                for item in col.get_all():
                    with child_context_manager(sane_path, item.href):
                        yield item
        elif len(parts) == 3:
            # Single item: e.g., "user@example.com/contacts/uuid.vcf"
            user = parts[0]
            href = parts[2]
            col = Collection(self, f"{parts[0]}/{parts[1]}", user)
            results = list(col.get_multi([href]))
            for h, item in results:
                if item:
                    yield item

    def move(self, item, to_collection, to_href):
        pass  # Not needed for CardDAV address books

    def create_collection(self, href, items=None, props=None):
        sane_path = href.strip("/")
        parts = sane_path.split("/")
        user = parts[0] if parts else ""
        col = Collection(self, sane_path, user)
        if props:
            col.set_meta(props)
        return (col, {}, [])

    @contextlib.contextmanager
    def acquire_lock(self, mode: str, user: str = "", **kwargs) -> Iterator[None]:
        # PostgreSQL handles concurrency; no explicit locking needed
        yield

    def verify(self) -> bool:
        return True
```

### Mount Radicale in FastAPI

**File: `backend/app/main.py`**

Add after the existing CORS middleware setup:

```python
from starlette.middleware.wsgi import WSGIMiddleware
from radicale import Application as RadicaleApp
from radicale.config import Configuration as RadicaleConfig

# Configure Radicale with our custom storage plugin
radicale_configuration = RadicaleConfig({
    "auth": {"type": "http_x_remote_user"},  # We'll handle auth ourselves
    "storage": {"type": "app.carddav.storage"},
    "server": {"hosts": ""},
})
radicale_app = RadicaleApp(radicale_configuration)
app.mount("/dav", WSGIMiddleware(radicale_app))
```

Add a `.well-known/carddav` redirect:

```python
from fastapi.responses import RedirectResponse

@app.get("/.well-known/carddav")
def well_known_carddav():
    return RedirectResponse(url="/dav/", status_code=301)
```

### Check

```bash
cd /home/will/Documents/Homelab/personal-crm/app/backend
uv run python -c "
from app.carddav.storage import Storage, Collection
print('OK: CardDAV storage module imports correctly')
"
```

---

## Step 7: Import Pipeline

### File: `backend/app/api/routes/import_export.py` (NEW FILE)

```python
"""Import and export routes for vCard and CSV files."""

import io
from typing import Any

import vobject
from fastapi import APIRouter, HTTPException, UploadFile, File
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Contact,
    ContactField,
    ContactFieldType,
    Address,
)
from app.vcard import vcard_to_contact_data, contact_to_vcard

router = APIRouter(prefix="/import-export", tags=["import-export"])


@router.post("/import/vcard")
async def import_vcard(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    file: UploadFile = File(...),
) -> Any:
    """Import contacts from a .vcf file (supports multiple vCards in one file)."""
    content = await file.read()
    text = content.decode("utf-8", errors="replace")

    imported = 0
    errors = []

    for card_text in _split_vcards(text):
        try:
            parsed = vcard_to_contact_data(card_text)
            contact_data = parsed["contact"]

            contact = Contact(
                owner_id=current_user.id,
                vcard_raw=parsed["vcard_raw"],
                **contact_data,
            )
            if parsed.get("uid"):
                # Check if contact with this UID already exists
                existing = session.get(Contact, parsed["uid"])
                if existing and existing.owner_id == current_user.id:
                    errors.append(f"Skipped duplicate: {contact_data.get('first_name', '')} {contact_data.get('last_name', '')}")
                    continue
                contact.id = parsed["uid"]

            session.add(contact)
            session.commit()
            session.refresh(contact)

            # Create contact fields
            for field_data in parsed["fields"]:
                cf = ContactField(
                    contact_id=contact.id,
                    field_type=ContactFieldType(field_data["field_type"]),
                    label=field_data.get("label", "other"),
                    value=field_data["value"],
                    is_primary=field_data.get("is_primary", False),
                )
                session.add(cf)

            # Create addresses
            for addr_data in parsed["addresses"]:
                addr = Address(contact_id=contact.id, **addr_data)
                session.add(addr)

            session.commit()
            imported += 1

        except Exception as e:
            errors.append(str(e))

    return {
        "imported": imported,
        "errors": errors,
    }


@router.get("/export/vcard")
def export_vcard(
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """Export all contacts as a single .vcf file."""
    from fastapi.responses import Response

    contacts = session.exec(
        select(Contact).where(Contact.owner_id == current_user.id)
    ).all()

    vcards = []
    for contact in contacts:
        if contact.vcard_raw:
            vcards.append(contact.vcard_raw)
        else:
            fields = session.exec(
                select(ContactField).where(ContactField.contact_id == contact.id)
            ).all()
            addresses = session.exec(
                select(Address).where(Address.contact_id == contact.id)
            ).all()
            vcards.append(contact_to_vcard(contact, fields, addresses))

    content = "\r\n".join(vcards)
    return Response(
        content=content,
        media_type="text/vcard",
        headers={"Content-Disposition": "attachment; filename=contacts.vcf"},
    )


@router.get("/export/json")
def export_json(
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """Export all data as JSON."""
    # This will be expanded as more models are added
    contacts = session.exec(
        select(Contact).where(Contact.owner_id == current_user.id)
    ).all()
    return {"contacts": [c.model_dump() for c in contacts]}


def _split_vcards(text: str) -> list[str]:
    """Split a multi-vCard file into individual vCard strings."""
    cards = []
    current = []
    for line in text.splitlines():
        current.append(line)
        if line.strip().upper() == "END:VCARD":
            cards.append("\r\n".join(current))
            current = []
    return cards
```

### Check

```bash
cd /home/will/Documents/Homelab/personal-crm/app/backend
uv run python -c "from app.api.routes.import_export import router; print(f'OK: import_export has {len(router.routes)} routes')"
```

---

## Steps 8-12: Frontend

### Overview

The frontend follows the template's pattern exactly:
1. Route file in `frontend/src/routes/_layout/`
2. Component directory in `frontend/src/components/`
3. After all backend changes, regenerate the API client: `./scripts/generate-client.sh`

### Step 8: Contact List Page

**Delete** these files/directories:
- `frontend/src/routes/_layout/items.tsx`
- `frontend/src/components/Items/`

**Create** `frontend/src/routes/_layout/contacts.tsx` following the exact same pattern as the deleted `items.tsx` but referencing `ContactsService` and `ContactPublic` types.

**Create** `frontend/src/components/Contacts/` with these files:
- `columns.tsx` — TanStack Table column definitions (name, company, tags, last contacted, favorite)
- `AddContact.tsx` — Dialog with form (first_name, last_name, company, title, phone, email)
- `EditContact.tsx` — Same form, pre-populated
- `DeleteContact.tsx` — Confirmation dialog
- `ContactActionsMenu.tsx` — Dropdown with Edit, Delete, Favorite toggle

Each file follows the exact same pattern as the Items equivalents. Use `react-hook-form` + `zod` for validation. Use `useMutation` from TanStack Query for create/update/delete.

### Step 9: Contact Detail Page

**Create** `frontend/src/routes/_layout/contacts/$contactId.tsx`

This page shows:
- Contact header (name, company, title, avatar)
- Contact fields (phones, emails, social)
- Addresses
- Tags and groups
- Relationships
- Pets
- Custom fields
- Tabs for: Timeline, Notes, Gifts, Life Events

### Step 10: Contact Create/Edit Forms

Use `react-hook-form` with nested field arrays for:
- Contact fields (add/remove phone/email/social rows)
- Addresses (add/remove address rows)
- Tag selection (multi-select dropdown)
- Group selection (multi-select dropdown)

### Step 11: Tags, Groups, Relationships

**Create** pages and components for:
- `frontend/src/routes/_layout/tags.tsx` + `frontend/src/components/Tags/`
- `frontend/src/routes/_layout/groups.tsx` + `frontend/src/components/Groups/`

Relationships are managed within the Contact Detail page, not as a standalone page.

### Step 12: Navigation and Dashboard

**File: `frontend/src/components/Sidebar/AppSidebar.tsx`**

Update the `navItems` array:

```typescript
const navItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Contacts", url: "/contacts", icon: Users },
  { title: "Tags", url: "/tags", icon: Tag },
  { title: "Groups", url: "/groups", icon: FolderOpen },
  { title: "Reminders", url: "/reminders", icon: Bell },
  { title: "Journal", url: "/journal", icon: BookOpen },
]
```

### Frontend Check

After completing steps 8-12:

```bash
cd /home/will/Documents/Homelab/personal-crm/app
# Regenerate API client
./scripts/generate-client.sh

# Type-check frontend
cd frontend
bun run typecheck

# Build frontend
bun run build
```

Expected: no TypeScript errors, build succeeds.

---

## Step 13: Docker Compose and Deployment

### File: `compose.prod.yml`

This is the homelab deployment compose file, separate from the template's development compose (`compose.yml` + `compose.override.yml`). Deploy with `docker compose -f compose.prod.yml up -d`.

```yaml
services:
  backend:
    build:
      context: ./app/backend
      dockerfile: Dockerfile
    env_file: .env
    networks:
      - pikenet-private
      - pikenet-internal-crm
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.crm-api.rule=Host(`kindred.${DOMAIN}`) && (PathPrefix(`/api`) || PathPrefix(`/docs`) || PathPrefix(`/dav`) || PathPrefix(`/.well-known`))"
      - "traefik.http.routers.crm-api.entrypoints=websecure"
      - "traefik.http.services.crm-api.loadbalancer.server.port=8000"
      - "traefik.docker.network=pikenet-private"
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    read_only: true
    tmpfs:
      - /tmp
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/v1/utils/health-check/"]
      interval: 30s
      timeout: 10s
      retries: 3
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy

  frontend:
    build:
      context: ./app/frontend
      dockerfile: Dockerfile
    networks:
      - pikenet-private
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.crm.rule=Host(`kindred.${DOMAIN}`)"
      - "traefik.http.routers.crm.entrypoints=websecure"
      - "traefik.http.services.crm.loadbalancer.server.port=80"
      - "traefik.docker.network=pikenet-private"
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    read_only: true

  db:
    image: postgres:18-alpine
    env_file: .env
    volumes:
      - crm-db:/var/lib/postgresql/data
    networks:
      - pikenet-internal-crm
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  worker:
    build:
      context: ./app/backend
      dockerfile: Dockerfile
    command: ["uv", "run", "arq", "app.worker.WorkerSettings"]
    env_file: .env
    networks:
      - pikenet-internal-crm
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy

  redis:
    image: redis:7-alpine
    volumes:
      - crm-redis:/data
    networks:
      - pikenet-internal-crm
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    read_only: true
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  meilisearch:
    image: getmeili/meilisearch:v1.12
    env_file: .env
    volumes:
      - crm-meili:/meili_data
    networks:
      - pikenet-internal-crm
    environment:
      - MEILI_ENV=production
      - MEILI_NO_ANALYTICS=true
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:7700/health"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  crm-db:
    external: true
  crm-redis:
    external: true
  crm-meili:
    external: true

networks:
  pikenet-private:
    external: true
  pikenet-internal-crm:
    external: true
```

### Check

```bash
cd /home/will/Documents/Homelab/personal-crm
docker compose config --quiet && echo "OK: compose file is valid" || echo "FAIL: compose file has errors"
```

---

## Step 14: Phase 2 — Interactions and Timeline

### Backend

The `Interaction` model and routes were already defined in Steps 1 and 3.

### Frontend: Unified Timeline Component

**Create** `frontend/src/components/Timeline/` with:

- `Timeline.tsx` — Renders a chronological list of all activity for a contact (interactions, notes, life events, gifts)
- `TimelineItem.tsx` — Single entry with icon (by channel type), timestamp, and notes
- `QuickLog.tsx` — A compact form for quickly logging an interaction (dropdown for channel, optional note, submit button)

The Timeline component fetches from multiple endpoints:
```typescript
// Parallel queries for a single contact's timeline
const interactions = useQuery({ queryKey: ["interactions", contactId], queryFn: () => InteractionsService.listByContact(contactId) })
const notes = useQuery({ queryKey: ["notes", contactId], queryFn: () => NotesService.listByContact(contactId) })
const lifeEvents = useQuery({ queryKey: ["life-events", contactId], queryFn: () => LifeEventsService.listByContact(contactId) })
```

Merge and sort all results by date, render in reverse chronological order.

### Check

After implementing:
```bash
cd /home/will/Documents/Homelab/personal-crm/app
./scripts/generate-client.sh
cd frontend && bun run typecheck && echo "OK: TypeScript passes"
```

---

## Step 15: Phase 2 — Reminders and Smart Cadences

### Backend: Cadence Calculation

**Add** to `backend/app/api/routes/contacts.py` a new endpoint:

```python
@router.get("/losing-touch", response_model=ContactsPublic)
def list_losing_touch(
    session: SessionDep,
    current_user: CurrentUser,
    limit: int = 20,
) -> Any:
    """Return contacts whose cadence has been exceeded.

    A contact is 'losing touch' if:
    - contact_frequency_days is set
    - last_contacted_at is NULL or older than contact_frequency_days ago
    """
    from datetime import timedelta

    now = datetime.now(timezone.utc)
    statement = (
        select(Contact)
        .where(
            Contact.owner_id == current_user.id,
            Contact.is_archived == False,
            Contact.contact_frequency_days.is_not(None),
        )
    )
    contacts = session.exec(statement).all()

    overdue = []
    for contact in contacts:
        if contact.last_contacted_at is None:
            overdue.append(contact)
        else:
            deadline = contact.last_contacted_at + timedelta(days=contact.contact_frequency_days)
            if now > deadline:
                overdue.append(contact)

    # Sort by most overdue first
    overdue.sort(
        key=lambda c: c.last_contacted_at or datetime.min.replace(tzinfo=timezone.utc)
    )

    return ContactsPublic(
        data=[ContactPublic.model_validate(c) for c in overdue[:limit]],
        count=len(overdue),
    )
```

### Check

```bash
cd /home/will/Documents/Homelab/personal-crm/app/backend
uv run python -c "
from app.api.routes.contacts import router
paths = [r.path for r in router.routes]
assert '/contacts/losing-touch' in ' '.join(paths) or 'losing-touch' in str(paths), 'losing-touch endpoint missing'
print('OK: losing-touch endpoint registered')
"
```

---

## Step 16: Phase 2 — ARQ Worker and Apprise Notifications

### Dependencies

Add to `backend/pyproject.toml`:

```
"arq>=0.26",
"apprise>=1.9.0",
```

Run: `cd backend && uv sync`

### File: `backend/app/worker.py` (NEW FILE)

```python
"""ARQ background worker for processing reminders and cadence checks."""

from datetime import datetime, timedelta, timezone

import apprise
from arq import cron
from sqlmodel import Session, create_engine, select

from app.core.config import settings
from app.models import Contact, Reminder, ReminderFrequency


async def check_reminders(ctx: dict) -> None:
    """Check for due reminders and send notifications via Apprise."""
    engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))
    now = datetime.now(timezone.utc)

    with Session(engine) as session:
        due_reminders = session.exec(
            select(Reminder).where(
                Reminder.is_active == True,
                Reminder.remind_at <= now,
                (Reminder.snoozed_until.is_(None)) | (Reminder.snoozed_until <= now),
            )
        ).all()

        if not due_reminders:
            return

        # Initialize Apprise with configured URLs
        apobj = apprise.Apprise()
        apprise_urls = getattr(settings, "APPRISE_URLS", "")
        if apprise_urls:
            for url in apprise_urls.split(","):
                apobj.add(url.strip())

        for reminder in due_reminders:
            # Build notification
            title = f"Reminder: {reminder.title}"
            body = reminder.description or reminder.title

            if reminder.contact_id:
                contact = session.get(Contact, reminder.contact_id)
                if contact:
                    body = f"{body}\nContact: {contact.first_name} {contact.last_name or ''}"

            # Send notification
            apobj.notify(title=title, body=body)

            # Update last_sent_at
            reminder.last_sent_at = now

            # Handle recurring reminders
            if reminder.frequency == ReminderFrequency.ONCE:
                reminder.is_active = False
            else:
                # Schedule next occurrence
                delta_map = {
                    ReminderFrequency.DAILY: timedelta(days=1),
                    ReminderFrequency.WEEKLY: timedelta(weeks=1),
                    ReminderFrequency.MONTHLY: timedelta(days=30),
                    ReminderFrequency.YEARLY: timedelta(days=365),
                }
                reminder.remind_at = now + delta_map.get(
                    reminder.frequency, timedelta(days=1)
                )

            session.add(reminder)

        session.commit()


async def check_cadences(ctx: dict) -> None:
    """Check for contacts whose cadence has been exceeded and create reminders."""
    engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))
    now = datetime.now(timezone.utc)

    with Session(engine) as session:
        contacts = session.exec(
            select(Contact).where(
                Contact.is_archived == False,
                Contact.contact_frequency_days.is_not(None),
            )
        ).all()

        apobj = apprise.Apprise()
        apprise_urls = getattr(settings, "APPRISE_URLS", "")
        if apprise_urls:
            for url in apprise_urls.split(","):
                apobj.add(url.strip())

        for contact in contacts:
            if contact.last_contacted_at is None:
                overdue = True
            else:
                deadline = contact.last_contacted_at + timedelta(
                    days=contact.contact_frequency_days
                )
                overdue = now > deadline

            if overdue:
                name = f"{contact.first_name} {contact.last_name or ''}".strip()
                apobj.notify(
                    title=f"Losing touch: {name}",
                    body=f"You haven't contacted {name} in over {contact.contact_frequency_days} days.",
                )


class WorkerSettings:
    """ARQ worker settings."""

    functions = [check_reminders, check_cadences]
    cron_jobs = [
        cron(check_reminders, minute={0, 30}),    # Every 30 minutes
        cron(check_cadences, hour={9}, minute={0}),  # Daily at 9 AM
    ]
    redis_settings = None  # Uses default localhost:6379

    @staticmethod
    def on_startup(ctx: dict) -> None:
        pass
```

### Config Addition

**File: `backend/app/core/config.py`**

Add to the `Settings` class:

```python
APPRISE_URLS: str = ""  # Comma-separated Apprise notification URLs
REDIS_URL: str = "redis://redis:6379"
MEILI_URL: str = "http://meilisearch:7700"
MEILI_MASTER_KEY: str = ""
```

### Check

```bash
cd /home/will/Documents/Homelab/personal-crm/app/backend
uv run python -c "from app.worker import WorkerSettings; print(f'OK: Worker has {len(WorkerSettings.functions)} functions and {len(WorkerSettings.cron_jobs)} cron jobs')"
```

---

## Steps 17-20: Summary (Phase 2-3 continued)

### Step 17: Gifts and Debts

The models and routes were defined in Steps 1 and 3. Frontend components:
- `frontend/src/components/Gifts/` — List, Add, Edit per contact
- `frontend/src/components/Debts/` — List, Add, Edit per contact with "Settle" action
- Displayed within the Contact Detail page as tabs

### Step 18: Dashboard

**Create** `frontend/src/routes/_layout/index.tsx` (dashboard page) with widgets:
- **Who to Contact Today** — fetch from `/api/v1/contacts/losing-touch`
- **Upcoming Reminders** — fetch from `/api/v1/reminders/?limit=10`
- **Recent Interactions** — fetch from `/api/v1/interactions/?limit=10`
- **Quick Log** — inline `QuickLog` component for rapid interaction logging

### Step 19: Webhook API

The `WebhookEndpoint` model was defined in Step 1. Route file `webhooks.py`:
- `POST /webhooks/inbound/{api_key}` — Accepts JSON with `contact_email` or `contact_name` to identify a contact, plus `channel`, `notes`. Creates an Interaction.
- `GET /webhooks/` — List configured webhook endpoints
- `POST /webhooks/` — Create a new webhook endpoint (generates API key)
- `DELETE /webhooks/{id}` — Delete a webhook endpoint

### Step 20: Meilisearch Integration

**File: `backend/app/search.py` (NEW FILE)**

```python
"""Meilisearch integration for full-text search."""

import meilisearch
from app.core.config import settings


def get_meili_client():
    return meilisearch.Client(settings.MEILI_URL, settings.MEILI_MASTER_KEY)


def index_contact(contact_id: str, data: dict):
    client = get_meili_client()
    index = client.index("contacts")
    index.add_documents([{"id": contact_id, **data}])


def search_contacts(query: str, limit: int = 20):
    client = get_meili_client()
    index = client.index("contacts")
    return index.search(query, {"limit": limit})
```

Add `"meilisearch>=0.31.0"` to `backend/pyproject.toml` dependencies.

### Check (Steps 17-20)

```bash
cd /home/will/Documents/Homelab/personal-crm/app/backend
uv run python -c "
from app.worker import WorkerSettings
from app.search import get_meili_client
from app.api.routes.webhooks import router
print('OK: All Phase 2-3 modules import correctly')
"
```

---

## Final Integration Check

After all steps are complete, run this full verification:

```bash
cd /home/will/Documents/Homelab/personal-crm/app

# 1. Backend imports and model validation
cd backend
uv run python -c "
from app.models import *
from app.crud import *
from app.vcard import *
from app.carddav.storage import Storage, Collection
from app.worker import WorkerSettings
from app.search import get_meili_client
print('PASS: All backend modules import')
"

# 2. Alembic migration check
uv run alembic check
echo "PASS: Alembic migrations are up to date"

# 3. Frontend build
cd ../frontend
bun install
bun run typecheck && echo "PASS: TypeScript type check" || echo "FAIL: TypeScript errors"
bun run build && echo "PASS: Frontend build" || echo "FAIL: Frontend build failed"

# 4. Docker Compose validation
cd /home/will/Documents/Homelab/personal-crm
docker compose config --quiet && echo "PASS: Docker Compose valid" || echo "FAIL: Docker Compose invalid"

# 5. Backend tests (run existing test suite — some tests for Items will need removal)
cd app/backend
uv run pytest tests/ -x -q 2>&1 | tail -5
```

---

## Quick Reference: File Map

```
personal-crm/
├── PLAN.md                              # High-level feature plan
├── HANDOFF.md                           # This file
├── compose.prod.yml                     # Homelab deployment compose
├── .env.sops                            # Encrypted secrets
└── app/                                 # Cloned from FastAPI template
    ├── compose.yml                      # Template's compose (dev reference)
    ├── scripts/generate-client.sh       # Regenerate frontend API client
    ├── backend/
    │   ├── pyproject.toml               # + vobject, radicale, arq, apprise, meilisearch
    │   └── app/
    │       ├── models.py                # All SQLModel models (Contact, Tag, Interaction, etc.)
    │       ├── crud.py                  # CRUD functions
    │       ├── vcard.py                 # NEW: vCard ↔ Contact conversion
    │       ├── search.py                # NEW: Meilisearch integration
    │       ├── worker.py                # NEW: ARQ background tasks
    │       ├── main.py                  # + Radicale mount + .well-known redirect
    │       ├── core/
    │       │   └── config.py            # + APPRISE_URLS, REDIS_URL, MEILI_URL
    │       ├── carddav/                 # NEW: CardDAV storage plugin
    │       │   ├── __init__.py
    │       │   └── storage.py
    │       └── api/
    │           ├── main.py              # Router aggregation (all CRM routes)
    │           └── routes/
    │               ├── contacts.py      # NEW
    │               ├── contact_fields.py # NEW
    │               ├── addresses.py     # NEW
    │               ├── tags.py          # NEW
    │               ├── groups.py        # NEW
    │               ├── relationships.py # NEW
    │               ├── pets.py          # NEW
    │               ├── custom_fields.py # NEW
    │               ├── interactions.py  # NEW
    │               ├── reminders.py     # NEW
    │               ├── gifts.py        # NEW
    │               ├── debts.py        # NEW
    │               ├── life_events.py  # NEW
    │               ├── notes.py        # NEW
    │               ├── journal.py      # NEW
    │               ├── import_export.py # NEW
    │               ├── webhooks.py     # NEW
    │               ├── login.py        # (unchanged)
    │               ├── users.py        # (unchanged)
    │               └── utils.py        # (unchanged)
    └── frontend/
        └── src/
            ├── routes/_layout/
            │   ├── contacts.tsx         # NEW (replaces items.tsx)
            │   ├── contacts/$contactId.tsx # NEW
            │   ├── tags.tsx             # NEW
            │   ├── groups.tsx           # NEW
            │   ├── reminders.tsx        # NEW
            │   ├── journal.tsx          # NEW
            │   └── index.tsx            # Dashboard (NEW/modified)
            └── components/
                ├── Contacts/            # NEW (replaces Items/)
                ├── Tags/                # NEW
                ├── Groups/              # NEW
                ├── Timeline/            # NEW
                ├── Gifts/               # NEW
                ├── Debts/               # NEW
                └── Sidebar/             # Modified nav items
```
