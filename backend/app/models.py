import enum
import uuid
from datetime import date, datetime, timezone
from typing import Any

import sqlalchemy as sa
from pydantic import EmailStr
from sqlalchemy import DateTime
from sqlalchemy.dialects.postgresql import JSONB, TSVECTOR
from sqlmodel import Field, Relationship, SQLModel
from sqlmodel import (
    Relationship as SQLMRelationship,  # alias; avoids shadowing by the Relationship table model below
)

from app.models_vcard_conflict import (  # noqa: F401
    VCardConflict,
    VCardConflictBase,
    VCardConflictPublic,
    VCardConflictsPublic,
)


def get_datetime_utc() -> datetime:
    return datetime.now(timezone.utc)


class SoftDeleteMixin:
    """Mixin that adds ``deleted_at`` for soft-delete support.

    Apply to SQLModel table classes to get:
    * ``deleted_at`` nullable datetime column (indexed)
    * ``is_deleted`` property for readability
    * ``mark_deleted()`` / ``restore()`` convenience helpers
    """

    deleted_at: datetime | None = Field(
        default=None,
        index=True,
        sa_type=DateTime(timezone=True),
        description=(
            "Soft-delete marker. When non-null, the row is hidden from the "
            "default query filter; restore by clearing this column."
        ),
    )

    @property
    def is_deleted(self) -> bool:
        """Return True if the row has been soft-deleted."""
        return self.deleted_at is not None

    def mark_deleted(self) -> None:
        """Set deleted_at to now (UTC)."""
        self.deleted_at = datetime.now(timezone.utc)

    def restore(self) -> None:
        """Clear deleted_at to un-delete the row."""
        self.deleted_at = None


# Shared properties
class UserBase(SQLModel):
    email: EmailStr = Field(
        unique=True,
        index=True,
        max_length=255,
        description="Login email; must be unique.",
    )
    is_active: bool = Field(
        default=True,
        description="Whether the account can log in.",
    )
    is_superuser: bool = Field(
        default=False,
        description="Grants admin-only endpoints.",
    )
    full_name: str | None = Field(
        default=None,
        max_length=255,
        description="Display name; optional.",
    )


# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserRegister(SQLModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on update, all are optional
class UserUpdate(UserBase):
    email: EmailStr | None = Field(default=None, max_length=255)  # type: ignore
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UserUpdateMe(SQLModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)


class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


# Database model, database table inferred from class name
class User(UserBase, table=True):
    """Authenticated user; tenant-scope owner of every row below."""

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        description="Primary key.",
    )
    hashed_password: str | None = Field(
        default=None,
        description="Argon2id hash; null for OIDC-only users.",
    )
    oidc_iss: str | None = Field(
        default=None,
        max_length=512,
        index=True,
        description="OIDC issuer URL; paired with oidc_sub forms the unique external identity.",
    )
    oidc_sub: str | None = Field(
        default=None,
        max_length=255,
        index=True,
        description="OIDC subject; paired with oidc_iss forms the unique external identity.",
    )
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
        description="When the account was created (UTC).",
    )

    __table_args__ = (
        sa.UniqueConstraint("oidc_iss", "oidc_sub", name="uq_user_oidc_identity"),
    )


# Properties to return via API, id is always required
class UserPublic(UserBase):
    id: uuid.UUID
    created_at: datetime | None = None


class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int


# ─── SavedFilter ─────────────────────────────────────────────────────────────


class FilterCondition(SQLModel):
    """Pydantic schema for a single filter condition (validated, not injected)."""

    field: str = Field(
        description="Contact column name, must be in the allowed fields list."
    )
    operator: str = Field(
        description="One of: equals, contains, in, gt, gte, lt, lte, before, after, is"
    )
    value: str | int | float | bool | date | list[str | int] | None = Field(
        description="Value to compare against; type depends on field and operator."
    )


class SavedFilterBase(SQLModel):
    name: str = Field(
        min_length=1,
        max_length=255,
        description="User-visible name for the smart list.",
    )
    filter_json: dict = Field(
        description="Structured filter: {conditions: FilterCondition[], op: 'and'|'or'}.",
        sa_column=sa.Column("filter_json", JSONB, nullable=False),
    )
    tag_id: uuid.UUID | None = Field(
        default=None,
        description="Optional tag; if set, filter is shared with users who have TagShare access.",
    )


class SavedFilterCreate(SavedFilterBase):
    pass


class SavedFilterUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    filter_json: dict | None = None
    tag_id: uuid.UUID | None = None


class SavedFilter(SavedFilterBase, table=True):
    """Saved filter / smart list owned by a user."""

    __tablename__ = "saved_filter"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        description="Primary key.",
    )
    owner_id: uuid.UUID = Field(
        foreign_key="user.id",
        nullable=False,
        ondelete="CASCADE",
        description="Owner user; cascades on delete.",
    )
    tag_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="tag.id",
        nullable=True,
        ondelete="SET NULL",
        description="Optional tag for sharing; nulled when the tag is deleted.",
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
        description="When the filter was created (UTC).",
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column_kwargs={"onupdate": lambda: datetime.now(timezone.utc)},
        nullable=False,
        description="Auto-bumped on edit (UTC).",
    )


class SavedFilterPublic(SavedFilterBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class SavedFiltersPublic(SQLModel):
    data: list[SavedFilterPublic]
    count: int


# ─── API Keys ─────────────────────────────────────────────────────────────────


class APIKey(SQLModel, table=True):
    __tablename__ = "api_key"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str = Field(max_length=255)
    key_hash: str = Field(
        max_length=64, sa_column=sa.Column(sa.String(64), unique=True, index=True)
    )
    key_prefix: str = Field(max_length=16)
    owned_by_user_id: uuid.UUID = Field(
        foreign_key="user.id",
        ondelete="CASCADE",
        index=True,
    )
    created_at: datetime = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),
    )
    last_used_at: datetime | None = Field(
        default=None,
        sa_type=DateTime(timezone=True),
    )
    revoked_at: datetime | None = Field(
        default=None,
        sa_type=DateTime(timezone=True),
    )
    expires_at: datetime | None = Field(
        default=None,
        sa_type=DateTime(timezone=True),
    )


class APIKeyImpersonate(SQLModel, table=True):
    __tablename__ = "api_key_impersonate"

    api_key_id: uuid.UUID = Field(
        foreign_key="api_key.id",
        primary_key=True,
        ondelete="CASCADE",
    )
    user_id: uuid.UUID = Field(
        foreign_key="user.id",
        primary_key=True,
        ondelete="CASCADE",
    )


class APIKeyCreate(SQLModel):
    name: str = Field(min_length=1, max_length=255)
    can_impersonate: list[uuid.UUID] = Field(default_factory=list)
    expires_at: datetime | None = None


class APIKeyPublic(SQLModel):
    id: uuid.UUID
    name: str
    key_prefix: str
    owned_by_user_id: uuid.UUID
    can_impersonate: list[uuid.UUID]
    created_at: datetime
    last_used_at: datetime | None
    revoked_at: datetime | None
    expires_at: datetime | None


class APIKeyCreated(APIKeyPublic):
    """Returned once at creation — plaintext_key is never stored."""

    plaintext_key: str


class APIKeysPublic(SQLModel):
    data: list[APIKeyPublic]
    count: int


# ─── Enums ────────────────────────────────────────────────────────────────────
# ─── Enums ────────────────────────────────────────────────────────────────────


class ContactFieldType(str, enum.Enum):
    EMAIL = "email"
    PHONE = "phone"


class GiftStatus(str, enum.Enum):
    IDEA = "idea"
    PURCHASED = "purchased"
    WRAPPED = "wrapped"
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
    SKIP = "skip"


class InteractionDraftSource(str, enum.Enum):
    """Origin of a draft interaction."""

    VOICE_MEMO = "voice_memo"
    EMAIL_SUGGESTION = "email_suggestion"
    MANUAL = "manual"
    IMPORT = "import"


class ReminderFrequency(str, enum.Enum):
    ONCE = "once"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"


class DebtDirection(str, enum.Enum):
    I_OWE = "i_owe"
    THEY_OWE = "they_owe"


class MediaCategory(str, enum.Enum):
    MOVIE = "movie"
    TV_SHOW = "tv_show"
    PODCAST = "podcast"
    MUSICIAN = "musician"
    BOOK = "book"
    OTHER = "other"


class ContactSource(str, enum.Enum):
    """Source system that created a contact."""

    MANUAL = "manual"
    VCARD_IMPORT = "vcard_import"
    CARDDAV = "carddav"
    GOOGLE = "google"
    WEBHOOK = "webhook"


# ─── Tag ──────────────────────────────────────────────────────────────────────


class TagBase(SQLModel):
    name: str = Field(
        min_length=1,
        max_length=100,
        description="Tag name, 1-100 chars.",
    )
    color: str | None = Field(
        default=None,
        max_length=7,
        description="Optional hex color like #ff0000 for UI display.",
    )
    description: str | None = Field(
        default=None,
        max_length=1000,
        description="Optional tag description.",
    )


class TagCreate(TagBase):
    pass


class TagUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    color: str | None = None
    description: str | None = None


class Tag(TagBase, table=True):
    """User-defined tag for grouping contacts."""

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        description="Primary key.",
    )
    owner_id: uuid.UUID = Field(
        foreign_key="user.id",
        nullable=False,
        ondelete="CASCADE",
        description="Owner user; cascades on delete.",
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
        description="When the tag was created (UTC).",
    )


class TagPublic(TagBase):
    id: uuid.UUID
    created_at: datetime


class TagsPublic(SQLModel):
    data: list[TagPublic]
    count: int


# ─── ContactTag (junction) ────────────────────────────────────────────────────


class ContactTag(SQLModel, table=True):
    """Many-to-many link between contacts and tags."""

    __tablename__ = "contact_tag"
    contact_id: uuid.UUID = Field(
        foreign_key="contact.id",
        primary_key=True,
        ondelete="CASCADE",
        description="Contact side of the link; cascades on delete.",
    )
    tag_id: uuid.UUID = Field(
        foreign_key="tag.id",
        primary_key=True,
        ondelete="CASCADE",
        description="Tag side of the link; cascades on delete.",
    )


# ─── TagShare (grant access to rows bearing a tag) ────────────────────────────


class TagShare(SQLModel, table=True):
    """Grants another user read access to all rows bearing a given tag."""

    __tablename__ = "tag_share"
    tag_id: uuid.UUID = Field(
        foreign_key="tag.id",
        primary_key=True,
        ondelete="CASCADE",
        description="Tag whose rows are being shared; cascades on delete.",
    )
    grantee_id: uuid.UUID = Field(
        foreign_key="user.id",
        primary_key=True,
        ondelete="CASCADE",
        description="User granted access; cascades on delete.",
    )
    created_at: datetime = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
        description="When the share was granted (UTC).",
    )


class TagSharePublic(SQLModel):
    tag_id: uuid.UUID
    grantee_id: uuid.UUID
    grantee_email: str
    created_at: datetime


class TagSharesPublic(SQLModel):
    data: list[TagSharePublic]
    count: int


# ─── Contact ─────────────────────────────────────────────────────────────────


class ContactBase(SQLModel):
    first_name: str = Field(
        min_length=1,
        max_length=255,
        description="Given name; required.",
    )
    last_name: str | None = Field(
        default=None,
        max_length=255,
        description="Family name.",
    )
    middle_name: str | None = Field(
        default=None,
        max_length=255,
        description="Middle name or initial.",
    )
    prefix: str | None = Field(
        default=None,
        max_length=50,
        description="Honorific like Dr., Mr., Ms.",
    )
    suffix: str | None = Field(
        default=None,
        max_length=50,
        description="Suffix like Jr., PhD.",
    )
    nickname: str | None = Field(
        default=None,
        max_length=255,
        description="Preferred or informal name.",
    )
    company: str | None = Field(
        default=None,
        max_length=255,
        description="Organization name.",
    )
    department: str | None = Field(
        default=None,
        max_length=255,
        description="Department within the company.",
    )
    title: str | None = Field(
        default=None,
        max_length=255,
        description="Job title.",
    )
    birthday: date | None = Field(
        default=None,
        description="Date of birth; used for milestone and birthday reminders.",
    )
    how_we_met: str | None = Field(
        default=None,
        max_length=2000,
        description="Short story of how the introduction happened.",
    )
    is_favorite: bool = Field(
        default=False,
        description="Pinned to the top of contact lists.",
    )
    is_archived: bool = Field(
        default=False,
        description="Soft-deleted; excluded from default lists.",
    )
    is_deceased: bool = Field(
        default=False,
        description="Marks the contact as deceased.",
    )
    deceased_at: date | None = Field(
        default=None,
        description="Date the contact passed away.",
    )
    contact_frequency_days: int | None = Field(
        default=None,
        ge=1,
        le=3650,
        description="Target days between interactions; drives losing-touch cadence.",
    )

    do_not_contact: bool = Field(
        default=False,
        description="If True, suppress all contact reminders and actions for this contact.",
    )
    do_not_contact_reason: str | None = Field(
        default=None,
        max_length=500,
        description="Optional reason why the contact was marked do-not-contact.",
    )
    # Kanban stage for relationship tracking
    stage: str | None = Field(
        default=None,
        max_length=100,
        description="Kanban stage like Active, Dormant, Lost.",
    )
    source: ContactSource = Field(
        default=ContactSource.MANUAL,
        description="Where this contact originated.",
    )
    source_external_id: str | None = Field(
        default=None,
        max_length=500,
        description="Opaque external ID for idempotent upserts from integrations.",
    )
    pronouns: str | None = Field(
        default=None,
        max_length=100,
        description="Contact's pronouns (e.g. they/them, she/her).",
    )
    timezone: str | None = Field(
        default=None,
        max_length=255,
        description="IANA timezone string (e.g. America/New_York).",
    )


class ContactCreate(ContactBase):
    tag_ids: list[uuid.UUID] | None = None


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
    how_we_met: str | None = None
    is_favorite: bool | None = None
    is_archived: bool | None = None
    is_deceased: bool | None = None
    deceased_at: date | None = None
    contact_frequency_days: int | None = None
    stage: str | None = None
    do_not_contact: bool | None = None
    do_not_contact_reason: str | None = None
    pronouns: str | None = None
    timezone: str | None = None
    tag_ids: list[uuid.UUID] | None = None


class Contact(SoftDeleteMixin, ContactBase, table=True):
    """Core contact entity — the subject of everything else in the CRM."""

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        description="Primary key.",
    )
    owner_id: uuid.UUID = Field(
        foreign_key="user.id",
        nullable=False,
        ondelete="CASCADE",
        description="Owner user; cascades on delete.",
    )
    # Full-text search vector, maintained by a DB trigger (see migration
    # a0b1c2d3e4f5). Excluded from the API; only used in search queries.
    search_vector: Any | None = Field(
        default=None,
        sa_column=sa.Column(TSVECTOR, nullable=True),
        exclude=True,
    )
    # Raw vCard text for CardDAV round-trip fidelity
    vcard_raw: str | None = Field(
        default=None,
        description="Raw vCard 3.0 text; preserves Apple extensions for CardDAV round-trip.",
    )
    vcard_etag: str | None = Field(
        default=None,
        max_length=255,
        description="ETag from the CardDAV server for incremental sync.",
    )
    vcard_sha256: str | None = Field(
        default=None,
        max_length=64,
        description="SHA256 hash of normalized vcard_raw; used for round-trip integrity verification.",
    )
    # Avatar stored as file path or URL
    avatar_url: str | None = Field(
        default=None,
        max_length=2048,
        description="URL or on-disk path to the contact's avatar image.",
    )

    # iMessage integration fields
    imessage_id: str | None = Field(
        default=None,
        max_length=500,
        index=True,
        description="E.164 phone or email for stable iMessage identity.",
    )
    imessage_synced_at: datetime | None = Field(
        default=None,
        description="When the contact was last synced from iMessage (UTC).",
    )
    imessage_profile_hash: str | None = Field(
        default=None,
        max_length=64,
        description="Hash of the iMessage profile data for idempotent updates.",
    )
    imessage_profile: dict | None = Field(
        default=None,
        sa_column=sa.Column("imessage_profile", JSONB, nullable=True),
        description="Raw iMessage profile data (JSON).",
    )

    # Computed: last time any interaction was logged with this contact
    last_contacted_at: datetime | None = Field(
        default=None,
        description="Auto-updated by create_interaction(); powers cadence queries.",
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
        description="When the contact was created (UTC).",
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column_kwargs={"onupdate": lambda: datetime.now(timezone.utc)},
        nullable=False,
        description="Auto-bumped on any column change (UTC).",
    )
    # Relationships
    tags: list[Tag] = Relationship(
        back_populates=None,
        link_model=ContactTag,
    )


# ─── ContactStageEvent ───────────────────────────────────────────────


class ContactStageEventBase(SQLModel):
    """Single stage transition on a contact."""

    from_stage: str | None = Field(
        default=None,
        max_length=100,
        description="Previous stage; null for the initial seed event.",
    )
    to_stage: str | None = Field(
        default=None,
        max_length=100,
        description="New stage; null when clearing stage (rare).",
    )
    occurred_at: datetime = Field(
        description="When the transition happened (UTC).",
    )
    note: str | None = Field(
        default=None,
        max_length=2000,
        description="Optional context about why the stage changed.",
    )


class ContactStageEventCreate(ContactStageEventBase):
    contact_id: uuid.UUID


class ContactStageEvent(ContactStageEventBase, table=True):
    """Audit log of every stage transition for a contact."""

    __tablename__ = "contact_stage_event"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        description="Primary key.",
    )
    contact_id: uuid.UUID = Field(
        foreign_key="contact.id",
        nullable=False,
        ondelete="CASCADE",
        description="Contact whose stage changed; cascades on delete.",
    )
    owner_id: uuid.UUID = Field(
        foreign_key="user.id",
        nullable=False,
        ondelete="CASCADE",
        description="Owner user; cascades on delete.",
    )
    created_at: datetime = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),
        nullable=False,
        description="When this event row was inserted (UTC).",
    )


class ContactStageEventPublic(ContactStageEventBase):
    id: uuid.UUID
    contact_id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime


class ContactStageEventsPublic(SQLModel):
    data: list[ContactStageEventPublic]
    count: int


class ContactPublic(ContactBase):
    id: uuid.UUID
    avatar_url: str | None
    last_contacted_at: datetime | None
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None
    contact_frequency_days: int | None = None
    do_not_contact: bool = False
    do_not_contact_reason: str | None = None
    tags: list[TagPublic] = []
    stage_events: list[ContactStageEventPublic] = []
    vcard_sha256: str | None = None

    imessage_id: str | None = None
    imessage_synced_at: datetime | None = None
    imessage_profile: dict | None = None


class ContactsPublic(SQLModel):
    data: list[ContactPublic]
    count: int


class OverdueContactPublic(ContactPublic):
    days_overdue: int | None = None


class OverdueContactsPublic(SQLModel):
    data: list[OverdueContactPublic]
    count: int


# ─── ContactField ────────────────────────────────────────────────────────────


class ContactFieldBase(SQLModel):
    field_type: ContactFieldType = Field(
        description="Kind of contact info (email or phone).",
    )
    label: str = Field(
        max_length=100,
        description='Label like "home", "work", "cell", "twitter".',
    )
    value: str = Field(
        min_length=1,
        max_length=2048,
        description="The actual email address, phone number, etc.",
    )
    is_primary: bool = Field(
        default=False,
        description="Marks the primary entry for this field_type on the contact.",
    )
    sort_order: int = Field(
        default=0,
        description="Display order within the same field_type.",
    )


class ContactFieldCreate(ContactFieldBase):
    contact_id: uuid.UUID


class ContactFieldUpdate(SQLModel):
    field_type: ContactFieldType | None = None
    label: str | None = None
    value: str | None = None
    is_primary: bool | None = None
    sort_order: int | None = None


class ContactField(ContactFieldBase, table=True):
    """Flexible contact info (emails, phones) attached to a contact."""

    __tablename__ = "contact_field"
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        description="Primary key.",
    )
    contact_id: uuid.UUID = Field(
        foreign_key="contact.id",
        nullable=False,
        ondelete="CASCADE",
        description="Parent contact; cascades on delete.",
    )


class ContactFieldPublic(ContactFieldBase):
    id: uuid.UUID
    contact_id: uuid.UUID


class ContactFieldsPublic(SQLModel):
    data: list[ContactFieldPublic]
    count: int


# ─── Address ─────────────────────────────────────────────────────────────────


class AddressBase(SQLModel):
    label: str = Field(
        max_length=100,
        default="home",
        description='Label like "home", "work", "other".',
    )
    street: str | None = Field(
        default=None,
        max_length=500,
        description="Street line 1.",
    )
    extended: str | None = Field(
        default=None,
        max_length=500,
        description="Apartment, suite, floor, etc.",
    )
    city: str | None = Field(
        default=None,
        max_length=255,
        description="City.",
    )
    region: str | None = Field(
        default=None,
        max_length=255,
        description="State, province, or region.",
    )
    postal_code: str | None = Field(
        default=None,
        max_length=50,
        description="ZIP or postal code.",
    )
    country: str | None = Field(
        default=None,
        max_length=255,
        description="Country.",
    )
    latitude: float | None = Field(
        default=None,
        description="Geocoded latitude; used for map visualization.",
    )
    longitude: float | None = Field(
        default=None,
        description="Geocoded longitude; used for map visualization.",
    )


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
    """Physical address attached to a contact."""

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        description="Primary key.",
    )
    contact_id: uuid.UUID = Field(
        foreign_key="contact.id",
        nullable=False,
        ondelete="CASCADE",
        description="Parent contact; cascades on delete.",
    )


class AddressPublic(AddressBase):
    id: uuid.UUID
    contact_id: uuid.UUID


class AddressesPublic(SQLModel):
    data: list[AddressPublic]
    count: int


# ─── Organization ────────────────────────────────────────────────────────────


class OrganizationBase(SQLModel):
    name: str = Field(min_length=1, max_length=255)
    domain: str | None = Field(default=None, max_length=255)
    industry: str | None = Field(default=None, max_length=255)
    notes: str | None = Field(default=None, max_length=2000)
    address_label: str = Field(default="main", max_length=100)
    address_street: str | None = Field(default=None, max_length=500)
    address_extended: str | None = Field(default=None, max_length=500)
    address_city: str | None = Field(default=None, max_length=255)
    address_region: str | None = Field(default=None, max_length=255)
    address_postal_code: str | None = Field(default=None, max_length=50)
    address_country: str | None = Field(default=None, max_length=255)
    address_latitude: float | None = None
    address_longitude: float | None = None


class OrganizationCreate(OrganizationBase):
    pass


class OrganizationUpdate(SQLModel):
    name: str | None = None
    domain: str | None = None
    industry: str | None = None
    notes: str | None = None
    address_label: str | None = None
    address_street: str | None = None
    address_extended: str | None = None
    address_city: str | None = None
    address_region: str | None = None
    address_postal_code: str | None = None
    address_country: str | None = None
    address_latitude: float | None = None
    address_longitude: float | None = None


class Organization(OrganizationBase, table=True):
    __tablename__ = "organization"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE", index=True
    )
    created_at: datetime = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),
        nullable=False,
    )
    updated_at: datetime = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),
        nullable=False,
    )


class OrganizationPublic(OrganizationBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    contact_count: int = 0


class OrganizationsPublic(SQLModel):
    data: list[OrganizationPublic]
    count: int


# ─── CommunicationPreference ─────────────────────────────────────────────────


class CommunicationPreferenceBase(SQLModel):
    preferred_channel: str | None = Field(default=None, max_length=20)
    best_time_local: str | None = Field(default=None, max_length=11)
    do_not_contact: bool = Field(default=False)
    do_not_contact_reason: str | None = Field(default=None, max_length=500)


class CommunicationPreferenceCreate(CommunicationPreferenceBase):
    contact_id: uuid.UUID


class CommunicationPreferenceUpdate(SQLModel):
    preferred_channel: str | None = None
    best_time_local: str | None = None
    do_not_contact: bool | None = None
    do_not_contact_reason: str | None = None


class CommunicationPreference(CommunicationPreferenceBase, table=True):
    __tablename__ = "communication_preference"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    contact_id: uuid.UUID = Field(
        foreign_key="contact.id",
        nullable=False,
        ondelete="CASCADE",
        index=True,
        sa_column_kwargs={"unique": True},
    )
    created_at: datetime = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),
        nullable=False,
    )
    updated_at: datetime = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),
        nullable=False,
    )


class CommunicationPreferencePublic(CommunicationPreferenceBase):
    id: uuid.UUID
    contact_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


# ─── Relationship ────────────────────────────────────────────────────────────


class InverseRelationshipMapBase(SQLModel):
    relationship_type: str = Field(
        max_length=100,
        description="Forward relationship type (e.g. 'parent').",
    )
    inverse_type: str = Field(
        max_length=100,
        description="Inverse relationship type (e.g. 'child').",
    )
    is_symmetric: bool = Field(
        default=False,
        description="True when both sides use the same type (spouse<->spouse).",
    )


class InverseRelationshipMap(InverseRelationshipMapBase, table=True):
    """Seed table mapping relationship types to their inverses.

    This replaces the Python-only mapping in ``relationship_inverses.py``
    so the database is the single source of truth and can be updated
    at runtime without a code deploy.
    """

    __tablename__ = "inverse_relationship_map"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        description="Primary key.",
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
        description="When the mapping row was inserted (UTC).",
    )

    __table_args__ = (
        sa.UniqueConstraint(
            "relationship_type", name="uq_inverse_map_relationship_type"
        ),
    )


class InverseRelationshipMapPublic(InverseRelationshipMapBase):
    id: uuid.UUID
    created_at: datetime


class InverseRelationshipMapsPublic(SQLModel):
    data: list[InverseRelationshipMapPublic]
    count: int


class InverseRelationshipMapCreate(InverseRelationshipMapBase):
    """Create schema for inverse relationship map."""

    pass


class InverseRelationshipMapUpdate(SQLModel):
    """Update schema - all fields optional."""

    inverse_type: str | None = Field(default=None, min_length=1, max_length=100)
    is_symmetric: bool | None = None


class RelationshipBase(SQLModel):
    relationship_type: str = Field(
        max_length=100,
        description="Kind of relationship: spouse, child, parent, sibling, friend, colleague, etc.",
    )
    notes: str | None = Field(
        default=None,
        max_length=1000,
        description="Additional context about the relationship.",
    )


class RelationshipCreate(RelationshipBase):
    contact_id: uuid.UUID  # "from" contact
    related_contact_id: uuid.UUID  # "to" contact
    inverse_relationship_type: str | None = Field(
        default=None,
        max_length=100,
        description="Type for the auto-created inverse row (e.g. 'parent' for 'child'). Inferred when omitted.",
    )


class RelationshipUpdate(SQLModel):
    relationship_type: str | None = None
    notes: str | None = None


class Relationship(RelationshipBase, table=True):
    """Directional link between two contacts (spouse, child, friend, etc.).

    To model a symmetric relationship, create two rows (one per direction).
    """

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        description="Primary key.",
    )
    contact_id: uuid.UUID = Field(
        foreign_key="contact.id",
        nullable=False,
        ondelete="CASCADE",
        description='"From" contact in the directional relationship.',
    )
    related_contact_id: uuid.UUID = Field(
        foreign_key="contact.id",
        nullable=False,
        ondelete="CASCADE",
        description='"To" contact in the directional relationship.',
    )
    inverse_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="relationship.id",
        nullable=True,
        ondelete="SET NULL",
        description="ID of the paired inverse row; NULL for one-way links.",
    )


class RelationshipPublic(RelationshipBase):
    id: uuid.UUID
    contact_id: uuid.UUID
    related_contact_id: uuid.UUID
    inverse_id: uuid.UUID | None = None


class RelationshipsPublic(SQLModel):
    data: list[RelationshipPublic]
    count: int


# ─── InverseRelationshipMap API routes ─────────────────────────────────────
# (imported by app/api/routes/relationship_inverse_map.py)


# ─── Pet ──────────────────────────────────────────────────────────────────────


class PetBase(SQLModel):
    name: str = Field(
        min_length=1,
        max_length=255,
        description="Pet's name.",
    )
    species: str | None = Field(
        default=None,
        max_length=100,
        description="Species like dog, cat, bird.",
    )
    breed: str | None = Field(
        default=None,
        max_length=100,
        description="Breed, if known.",
    )
    notes: str | None = Field(
        default=None,
        max_length=1000,
        description="Freeform notes (e.g. allergies, birthday).",
    )


class PetCreate(PetBase):
    contact_id: uuid.UUID


class PetUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    species: str | None = None
    breed: str | None = None
    notes: str | None = None


class Pet(PetBase, table=True):
    """Pet owned by a contact; useful for memorable conversation hooks."""

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        description="Primary key.",
    )
    contact_id: uuid.UUID = Field(
        foreign_key="contact.id",
        nullable=False,
        ondelete="CASCADE",
        description="Owner contact; cascades on delete.",
    )


class PetPublic(PetBase):
    id: uuid.UUID
    contact_id: uuid.UUID


class PetsPublic(SQLModel):
    data: list[PetPublic]
    count: int


# ─── CustomFieldDefinition ───────────────────────────────────────────────────


class CustomFieldDefinitionBase(SQLModel):
    """Defines a custom field type that can be attached to any contact.
    Example: name="Dietary Restrictions", field_type="text"
    Example: name="Preferred Filament", field_type="text"
    """

    name: str = Field(
        min_length=1,
        max_length=255,
        description="Custom field name shown in the UI.",
    )
    field_type: str = Field(
        max_length=50,
        default="text",
        description="Field type: text, number, date, boolean, or select.",
    )
    description: str | None = Field(
        default=None,
        max_length=500,
        description="Help text displayed alongside the field in the UI.",
    )
    # For "select" type: comma-separated options
    options: str | None = Field(
        default=None,
        max_length=2000,
        description='Comma-separated options for field_type="select".',
    )
    icon: str | None = Field(
        default=None,
        max_length=50,
        description='Icon slug for the UI (e.g. "heart", "book").',
    )


class CustomFieldDefinitionCreate(CustomFieldDefinitionBase):
    pass


class CustomFieldDefinitionUpdate(SQLModel):
    name: str | None = None
    field_type: str | None = None
    description: str | None = None
    options: str | None = None
    icon: str | None = None


class CustomFieldDefinition(CustomFieldDefinitionBase, table=True):
    """User-defined custom field schema, scoped to one owner."""

    __tablename__ = "custom_field_definition"
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        description="Primary key.",
    )
    owner_id: uuid.UUID = Field(
        foreign_key="user.id",
        nullable=False,
        ondelete="CASCADE",
        description="Owner user; cascades on delete.",
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
        description="When the definition was created (UTC).",
    )


class CustomFieldDefinitionPublic(CustomFieldDefinitionBase):
    id: uuid.UUID
    created_at: datetime


class CustomFieldDefinitionsPublic(SQLModel):
    data: list[CustomFieldDefinitionPublic]
    count: int


# ─── CustomFieldValue ────────────────────────────────────────────────────────


class CustomFieldValueBase(SQLModel):
    value: str = Field(
        max_length=5000,
        description="Value as a string; coerced from the declared field_type.",
    )


class CustomFieldValueCreate(CustomFieldValueBase):
    contact_id: uuid.UUID
    field_definition_id: uuid.UUID


class CustomFieldValueUpdate(SQLModel):
    value: str | None = None


class CustomFieldValue(CustomFieldValueBase, table=True):
    """Value of a custom field for a specific contact (one per contact per definition)."""

    __tablename__ = "custom_field_value"
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        description="Primary key.",
    )
    contact_id: uuid.UUID = Field(
        foreign_key="contact.id",
        nullable=False,
        ondelete="CASCADE",
        description="Contact this value belongs to; cascades on delete.",
    )
    field_definition_id: uuid.UUID = Field(
        foreign_key="custom_field_definition.id",
        nullable=False,
        ondelete="CASCADE",
        description="Custom field definition this value instantiates; cascades on delete.",
    )


class CustomFieldValuePublic(CustomFieldValueBase):
    id: uuid.UUID
    contact_id: uuid.UUID
    field_definition_id: uuid.UUID
    field_name: str | None = None  # populated from join


class CustomFieldValuesPublic(SQLModel):
    data: list[CustomFieldValuePublic]
    count: int


# ─── Interaction ──────────────────────────────────────────────────────────────


class InteractionBase(SQLModel):
    channel: InteractionChannel = Field(
        description="How the interaction happened (call, in_person, text, etc.).",
    )
    occurred_at: datetime = Field(
        description="When the interaction actually took place.",
    )
    notes: str | None = Field(
        default=None,
        max_length=10000,
        description="Conversation summary, action items, etc.",
    )
    mood: str | None = Field(
        default=None,
        max_length=50,
        description="Emoji or keyword capturing the tone.",
    )
    duration_minutes: int | None = Field(
        default=None,
        ge=0,
        description="Length of the interaction in minutes.",
    )


class InteractionCreate(InteractionBase):
    attendee_ids: list[uuid.UUID] = Field(
        min_length=1,
        description="Contacts that attended; must have at least one.",
    )
    is_draft: bool = False
    draft_source: str | None = Field(default=None, max_length=32)


class InteractionUpdate(SQLModel):
    channel: InteractionChannel | None = None
    occurred_at: datetime | None = None
    notes: str | None = None
    mood: str | None = None
    duration_minutes: int | None = None
    attendee_ids: list[uuid.UUID] | None = Field(
        default=None,
        min_length=1,
        description="Replace the attendee set; must have at least one if provided.",
    )


class InteractionAttendee(SQLModel, table=True):
    """Many-to-many link between interactions and contacts (attendees)."""

    __tablename__ = "interaction_attendee"
    interaction_id: uuid.UUID = Field(
        foreign_key="interaction.id",
        primary_key=True,
        ondelete="CASCADE",
        description="Interaction side of the link; cascades on delete.",
    )
    contact_id: uuid.UUID = Field(
        foreign_key="contact.id",
        primary_key=True,
        ondelete="CASCADE",
        description="Contact side of the link; cascades on delete.",
    )


class Interaction(SoftDeleteMixin, InteractionBase, table=True):
    """Logged touchpoint with one or more contacts (call, meeting, text, etc.).

    A single interaction can have multiple attendees via ``interaction_attendee``.
    Creating or modifying rows recomputes each attendee's ``last_contacted_at``.
    """

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        description="Primary key.",
    )
    owner_id: uuid.UUID = Field(
        foreign_key="user.id",
        nullable=False,
        ondelete="CASCADE",
        description="Owner user; cascades on delete.",
    )
    # Full-text search vector, maintained by a DB trigger (see migration
    # a0b1c2d3e4f5). Excluded from the API; only used in search queries.
    search_vector: Any | None = Field(
        default=None,
        sa_column=sa.Column(TSVECTOR, nullable=True),
        exclude=True,
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
        description="When the row was inserted (may be after occurred_at; UTC).",
    )
    deleted_at: datetime | None = Field(
        default=None,
        index=True,
        description=(
            "Soft-delete marker. When non-null, the row is hidden from "
            "default queries; restore by clearing this column."
        ),
    )
    is_draft: bool = Field(
        default=False, description="Draft interactions are not yet confirmed."
    )
    draft_source: str | None = Field(default=None, max_length=32)
    location_label: str | None = Field(default=None, max_length=500)
    latitude: float | None = None
    longitude: float | None = None
    message_id: str | None = Field(default=None, max_length=998)
    email_subject: str | None = Field(default=None, max_length=998)
    email_from: str | None = Field(default=None, max_length=2048)
    email_to: str | None = Field(default=None, max_length=2048)
    email_date: datetime | None = None


class InteractionAttendeeSummary(SQLModel):
    id: uuid.UUID
    first_name: str
    last_name: str | None = None
    avatar_url: str | None = None


class InteractionPublic(InteractionBase):
    id: uuid.UUID
    attendees: list[InteractionAttendeeSummary] = []
    created_at: datetime
    deleted_at: datetime | None = None
    is_draft: bool = False
    draft_source: str | None = None
    location_label: str | None = None
    latitude: float | None = None
    longitude: float | None = None


class InteractionsPublic(SQLModel):
    data: list[InteractionPublic]
    count: int


# ─── ReminderSnooze ──────────────────────────────────────────────────────


class ReminderSnooze(SQLModel, table=True):
    """Append-only log of snooze actions on reminders."""

    __tablename__ = "reminder_snooze"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        description="Primary key.",
    )
    reminder_id: uuid.UUID = Field(
        foreign_key="reminder.id",
        nullable=False,
        ondelete="CASCADE",
        description="Reminder being snoozed.",
    )
    snoozed_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
        description="When the user clicked snooze.",
    )
    snoozed_until: datetime = Field(
        nullable=False,
        description="New snooze deadline.",
    )
    reason: str | None = Field(
        default=None,
        description="Optional user-entered reason for snoozing.",
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
        description="Row creation time (may equal snoozed_at).",
    )


# ─── Reminder ─────────────────────────────────────────────────────────────────


class ReminderBase(SQLModel):
    title: str = Field(
        min_length=1,
        max_length=500,
        description="Reminder title.",
    )
    description: str | None = Field(
        default=None,
        max_length=2000,
        description="Extra details shown with the reminder.",
    )
    remind_at: datetime = Field(
        description="When to fire the reminder.",
    )
    frequency: ReminderFrequency = Field(
        default=ReminderFrequency.ONCE,
        description="How often the reminder repeats.",
    )
    is_active: bool = Field(
        default=True,
        description="Enable or disable without deleting.",
    )


class ReminderCreate(ReminderBase):
    contact_id: uuid.UUID | None = None  # optional — can be standalone


class ReminderUpdate(SQLModel):
    title: str | None = None
    description: str | None = None
    remind_at: datetime | None = None
    frequency: ReminderFrequency | None = None
    is_active: bool | None = None


class Reminder(SoftDeleteMixin, ReminderBase, table=True):
    """Scheduled reminder; contact-specific or standalone."""

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        description="Primary key.",
    )
    contact_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="contact.id",
        ondelete="CASCADE",
        description="Optional contact; null for standalone reminders.",
    )
    owner_id: uuid.UUID = Field(
        foreign_key="user.id",
        nullable=False,
        ondelete="CASCADE",
        description="Owner user; cascades on delete.",
    )
    last_sent_at: datetime | None = Field(
        default=None,
        description="When the ARQ worker last fired this reminder.",
    )
    snoozed_until: datetime | None = Field(
        default=None,
        description="If set, suppress firing until this time.",
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
        description="When the reminder was created (UTC).",
    )
    deleted_at: datetime | None = Field(
        default=None,
        index=True,
        description=(
            "Soft-delete marker. When non-null, the row is hidden from "
            "default queries; restore by clearing this column."
        ),
    )

    snoozes: list[ReminderSnooze] = SQLMRelationship()


class ReminderPublic(ReminderBase):
    id: uuid.UUID
    contact_id: uuid.UUID | None
    last_sent_at: datetime | None
    snoozed_until: datetime | None
    created_at: datetime
    deleted_at: datetime | None = None


class RemindersPublic(SQLModel):
    data: list[ReminderPublic]


class ReminderWithContactPublic(ReminderPublic):
    """Reminder with optional contact name for list views."""

    contact_name: str | None = None


class RemindersWithContactPublic(SQLModel):
    """Response wrapper for reminders that include contact name."""

    data: list[ReminderWithContactPublic]
    count: int


class ReminderSnoozeRequest(SQLModel):
    minutes: int | None = 30
    snoozed_until: datetime | None = None
    reason: str | None = None


class ReminderSnoozeHistoryEntry(SQLModel):
    id: uuid.UUID
    reminder_id: uuid.UUID
    snoozed_at: datetime
    snoozed_until: datetime
    reason: str | None = None


class ReminderSnoozeStat(SQLModel):
    reminder_id: uuid.UUID
    snooze_count: int


class ReminderContactSummary(SQLModel):
    contact_id: uuid.UUID | None
    contact_name: str | None = None
    reminder_count: int


class ReminderContactInfo(SQLModel):
    id: uuid.UUID
    first_name: str
    last_name: str | None = None


class ReminderDuePublic(ReminderPublic):
    contact_name: str | None = None
    contact: ReminderContactInfo | None = None


class RemindersDuePublic(SQLModel):
    data: list[ReminderDuePublic]
    count: int


class ChronicSnoozer(SQLModel):
    contact_id: uuid.UUID | None
    reminder_id: uuid.UUID
    snooze_count: int


# ─── Gift ─────────────────────────────────────────────────────────────────────


class GiftBase(SQLModel):
    name: str = Field(
        min_length=1,
        max_length=500,
        description="Gift name.",
    )
    description: str | None = Field(
        default=None,
        max_length=2000,
        description="Details about the gift.",
    )
    status: GiftStatus = Field(
        default=GiftStatus.IDEA,
        description="Lifecycle: idea, given, or received.",
    )
    occasion: str | None = Field(
        default=None,
        max_length=255,
        description="Occasion like Birthday, Christmas, Housewarming.",
    )
    gift_date: date | None = Field(
        default=None,
        description="When the gift was given or received.",
    )
    value_amount: float | None = Field(
        default=None,
        description="Monetary cost or value.",
    )
    value_currency: str = Field(
        default="USD",
        max_length=3,
        description="ISO 4217 currency code.",
    )
    url: str | None = Field(
        default=None,
        max_length=2048,
        description="Link to the product page (e.g. Amazon).",
    )


class GiftCreate(GiftBase):
    contact_id: uuid.UUID


class GiftUpdate(SQLModel):
    name: str | None = None
    description: str | None = None
    status: GiftStatus | None = None
    occasion: str | None = None
    gift_date: date | None = None
    value_amount: float | None = None
    value_currency: str | None = None
    url: str | None = None


class Gift(SoftDeleteMixin, GiftBase, table=True):
    """Gift idea or record for a contact."""

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        description="Primary key.",
    )
    contact_id: uuid.UUID = Field(
        foreign_key="contact.id",
        nullable=False,
        ondelete="CASCADE",
        description="Contact the gift is for; cascades on delete.",
    )
    owner_id: uuid.UUID = Field(
        foreign_key="user.id",
        nullable=False,
        ondelete="CASCADE",
        description="Owner user; cascades on delete.",
    )
    gift_date: date | None = Field(
        default=None,
        sa_column=sa.Column("date", sa.Date, nullable=True),
        description="When the gift was given or received (stored in the `date` column).",
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
        description="When the gift record was created (UTC).",
    )
    deleted_at: datetime | None = Field(
        default=None,
        index=True,
        description=(
            "Soft-delete marker. When non-null, the row is hidden from "
            "default queries; restore by clearing this column."
        ),
    )


class GiftPublic(GiftBase):
    id: uuid.UUID
    contact_id: uuid.UUID
    created_at: datetime
    deleted_at: datetime | None = None


class GiftsPublic(SQLModel):
    data: list[GiftPublic]
    count: int


# ─── Debt ─────────────────────────────────────────────────────────────────────


class DebtBase(SQLModel):
    direction: DebtDirection = Field(
        description="Who owes whom: i_owe (you owe them) or they_owe (they owe you).",
    )
    amount: float = Field(
        gt=0,
        description="Amount owed; must be greater than zero.",
    )
    currency: str = Field(
        default="USD",
        max_length=3,
        description="ISO 4217 currency code.",
    )
    reason: str | None = Field(
        default=None,
        max_length=1000,
        description="What the debt is for.",
    )
    is_settled: bool = Field(
        default=False,
        description="Marked paid off.",
    )
    settled_at: date | None = Field(
        default=None,
        description="Date the debt was settled.",
    )


class DebtCreate(DebtBase):
    contact_id: uuid.UUID


class DebtUpdate(SQLModel):
    direction: DebtDirection | None = None
    amount: float | None = None
    currency: str | None = None
    reason: str | None = None
    is_settled: bool | None = None
    settled_at: date | None = None


class Debt(SoftDeleteMixin, DebtBase, table=True):
    """Money owed to or from a contact."""

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        description="Primary key.",
    )
    contact_id: uuid.UUID = Field(
        foreign_key="contact.id",
        nullable=False,
        ondelete="CASCADE",
        description="Contact on the other side of the debt; cascades on delete.",
    )
    owner_id: uuid.UUID = Field(
        foreign_key="user.id",
        nullable=False,
        ondelete="CASCADE",
        description="Owner user; cascades on delete.",
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
        description="When the debt was recorded (UTC).",
    )
    deleted_at: datetime | None = Field(
        default=None,
        index=True,
        description=(
            "Soft-delete marker. When non-null, the row is hidden from "
            "default queries; restore by clearing this column."
        ),
    )


class DebtPaymentCreate(SQLModel):
    debt_id: uuid.UUID
    amount: float
    paid_at: date
    note: str | None = None


class DebtPayment(SQLModel, table=True):
    __tablename__ = "debt_payment"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    debt_id: uuid.UUID = Field(
        foreign_key="debt.id", nullable=False, ondelete="CASCADE", index=True
    )
    amount: float = Field(nullable=False)
    paid_at: date = Field(nullable=False)
    note: str | None = Field(default=None)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class DebtPaymentPublic(SQLModel):
    id: uuid.UUID
    debt_id: uuid.UUID
    amount: float
    paid_at: date
    note: str | None = None
    created_at: datetime


class DebtPublic(DebtBase):
    id: uuid.UUID
    contact_id: uuid.UUID
    created_at: datetime
    deleted_at: datetime | None = None
    paid_amount: float = 0.0
    payments: list[DebtPaymentPublic] = Field(default_factory=list)


class DebtsPublic(SQLModel):
    data: list[DebtPublic]
    count: int


# ─── LifeEvent ────────────────────────────────────────────────────────────────


class LifeEventBase(SQLModel):
    event_type: str = Field(
        max_length=100,
        description="Kind of milestone: job_change, move, wedding, baby, graduation, birthday, anniversary, etc.",
    )
    title: str = Field(
        min_length=1,
        max_length=500,
        description="Event title.",
    )
    description: str | None = Field(
        default=None,
        max_length=2000,
        description="Extra details about the event.",
    )
    occurred_at: date = Field(
        description="Date the event happened.",
    )
    create_annual_reminder: bool = Field(
        default=False,
        description="If true, auto-create a yearly recurring reminder on this date.",
    )


class LifeEventCreate(LifeEventBase):
    contact_id: uuid.UUID


class LifeEventUpdate(SQLModel):
    event_type: str | None = None
    title: str | None = None
    description: str | None = None
    occurred_at: date | None = None
    create_annual_reminder: bool | None = None


class LifeEvent(SoftDeleteMixin, LifeEventBase, table=True):
    """Milestone on a contact's timeline (job change, wedding, move, etc.)."""

    __tablename__ = "life_event"
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        description="Primary key.",
    )
    contact_id: uuid.UUID = Field(
        foreign_key="contact.id",
        nullable=False,
        ondelete="CASCADE",
        description="Contact the event belongs to; cascades on delete.",
    )
    owner_id: uuid.UUID = Field(
        foreign_key="user.id",
        nullable=False,
        ondelete="CASCADE",
        description="Owner user; cascades on delete.",
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
        description="When the event was logged (UTC).",
    )
    deleted_at: datetime | None = Field(
        default=None,
        index=True,
        description=(
            "Soft-delete marker. When non-null, the row is hidden from "
            "default queries; restore by clearing this column."
        ),
    )


class LifeEventPublic(LifeEventBase):
    id: uuid.UUID
    contact_id: uuid.UUID
    created_at: datetime
    deleted_at: datetime | None = None


class LifeEventsPublic(SQLModel):
    data: list[LifeEventPublic]
    count: int


# ─── Note (per-contact timestamped notes) ────────────────────────────────────


class NoteBase(SQLModel):
    body: str = Field(
        min_length=1,
        max_length=50000,
        description="Note body, 1-50000 chars.",
    )


class NoteCreate(NoteBase):
    contact_id: uuid.UUID
    client_id: str | None = Field(
        default=None,
        max_length=36,
        description="Client-generated UUID for idempotent POSTs; optional.",
    )


class NoteUpdate(SQLModel):
    body: str | None = None


class NoteMention(SQLModel, table=True):
    """Many-to-many link between notes and contacts referenced via @[Name](uuid) tokens."""

    __tablename__ = "note_mention"
    note_id: uuid.UUID = Field(
        foreign_key="note.id",
        primary_key=True,
        ondelete="CASCADE",
        description="Note side of the link; cascades on delete.",
    )
    contact_id: uuid.UUID = Field(
        foreign_key="contact.id",
        primary_key=True,
        ondelete="CASCADE",
        description="Mentioned contact; cascades on delete.",
    )


class Note(SoftDeleteMixin, NoteBase, table=True):
    """Timestamped freeform note attached to a specific contact."""

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        description="Primary key.",
    )
    client_id: str | None = Field(
        default=None,
        index=True,
        unique=True,
        description="Client-generated UUID for idempotent POSTs; unique if set.",
    )
    contact_id: uuid.UUID = Field(
        foreign_key="contact.id",
        nullable=False,
        ondelete="CASCADE",
        description="Contact the note is attached to; cascades on delete.",
    )
    owner_id: uuid.UUID = Field(
        foreign_key="user.id",
        nullable=False,
        ondelete="CASCADE",
        description="Owner user; cascades on delete.",
    )
    # Full-text search vector, maintained by a DB trigger (see migration
    # a0b1c2d3e4f5). Excluded from the API; only used in search queries.
    search_vector: Any | None = Field(
        default=None,
        sa_column=sa.Column(TSVECTOR, nullable=True),
        exclude=True,
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
        description="When the note was created (UTC).",
    )
    deleted_at: datetime | None = Field(
        default=None,
        index=True,
        description=(
            "Soft-delete marker. When non-null, the row is hidden from "
            "default queries; restore by clearing this column."
        ),
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column_kwargs={"onupdate": lambda: datetime.now(timezone.utc)},
        nullable=False,
        description="Auto-bumped on edit (UTC).",
    )


class NotePublic(NoteBase):
    id: uuid.UUID
    contact_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None


class NotesPublic(SQLModel):
    data: list[NotePublic]
    count: int


# ─── MediaRecommendation (per-contact media suggestions) ─────────────────────


class MediaRecommendationBase(SQLModel):
    category: MediaCategory = Field(
        description="Media category: movie, tv_show, podcast, musician, book, or other.",
    )
    title: str = Field(
        min_length=1,
        max_length=500,
        description="Title of the work.",
    )
    creator: str | None = Field(
        default=None,
        max_length=500,
        description="Author, director, artist, or similar creator.",
    )
    note: str | None = Field(
        default=None,
        max_length=5000,
        description="Why it was recommended or personal reaction.",
    )
    recommended_at: date | None = Field(
        default=None,
        description="Date the recommendation was made.",
    )


class MediaRecommendationCreate(MediaRecommendationBase):
    contact_id: uuid.UUID


class MediaRecommendationUpdate(SQLModel):
    category: MediaCategory | None = None
    title: str | None = None
    creator: str | None = None
    note: str | None = None
    recommended_at: date | None = None


class MediaRecommendation(MediaRecommendationBase, table=True):
    """Media (book, show, podcast, etc.) recommended to or by a contact."""

    __tablename__ = "media_recommendation"
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        description="Primary key.",
    )
    contact_id: uuid.UUID = Field(
        foreign_key="contact.id",
        nullable=False,
        ondelete="CASCADE",
        description="Contact the recommendation is tied to; cascades on delete.",
    )
    owner_id: uuid.UUID = Field(
        foreign_key="user.id",
        nullable=False,
        ondelete="CASCADE",
        description="Owner user; cascades on delete.",
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
        description="When the recommendation was logged (UTC).",
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column_kwargs={"onupdate": lambda: datetime.now(timezone.utc)},
        nullable=False,
        description="Auto-bumped on edit (UTC).",
    )


class MediaRecommendationPublic(MediaRecommendationBase):
    id: uuid.UUID
    contact_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class MediaRecommendationsPublic(SQLModel):
    data: list[MediaRecommendationPublic]
    count: int


# ─── JournalEntry (not tied to a contact) ────────────────────────────────────


class JournalEntryBase(SQLModel):
    body: str = Field(
        min_length=1,
        max_length=50000,
        description="Entry body, 1-50000 chars.",
    )
    mood: str | None = Field(
        default=None,
        max_length=50,
        description="Emoji or keyword capturing the mood.",
    )
    entry_date: date = Field(
        description="Date the entry is about (may differ from created_at).",
    )


class JournalEntryCreate(JournalEntryBase):
    contact_ids: list[uuid.UUID] | None = None


class JournalEntryUpdate(SQLModel):
    body: str | None = None
    mood: str | None = None
    entry_date: date | None = None


class JournalEntry(JournalEntryBase, table=True):
    """Personal journal entry, not tied to a specific contact."""

    __tablename__ = "journal_entry"
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        description="Primary key.",
    )
    owner_id: uuid.UUID = Field(
        foreign_key="user.id",
        nullable=False,
        ondelete="CASCADE",
        description="Owner user; cascades on delete.",
    )
    # Full-text search vector, maintained by a DB trigger (see migration
    # a0b1c2d3e4f5). Excluded from the API; only used in search queries.
    search_vector: Any | None = Field(
        default=None,
        sa_column=sa.Column(TSVECTOR, nullable=True),
        exclude=True,
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
        description="When the entry was logged (UTC).",
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column_kwargs={"onupdate": lambda: datetime.now(timezone.utc)},
        nullable=False,
        description="Auto-bumped on edit (UTC).",
    )


class JournalEntryContact(SQLModel, table=True):
    """Many-to-many link between journal entries and contacts."""

    __tablename__ = "journal_entry_contact"
    journal_entry_id: uuid.UUID = Field(
        foreign_key="journal_entry.id",
        primary_key=True,
        ondelete="CASCADE",
        description="Journal entry side of the link; cascades on delete.",
    )
    contact_id: uuid.UUID = Field(
        foreign_key="contact.id",
        primary_key=True,
        ondelete="CASCADE",
        description="Contact side of the link; cascades on delete.",
    )


class JournalEntryPublic(JournalEntryBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    contact_ids: list[uuid.UUID] = []


class JournalEntriesPublic(SQLModel):
    data: list[JournalEntryPublic]
    count: int


# ─── WebhookEndpoint (for inbound/outbound webhooks) ─────────────────────────


class WebhookEndpointBase(SQLModel):
    name: str = Field(
        min_length=1,
        max_length=255,
        description="Human-readable endpoint name.",
    )
    url: str | None = Field(
        default=None,
        max_length=2048,
        description="Target URL for outbound webhooks; null for inbound.",
    )
    direction: str = Field(
        max_length=10,
        description='"inbound" or "outbound".',
    )
    event_types: str | None = Field(
        default=None,
        max_length=1000,
        description="Comma-separated event types (e.g. contact.created,interaction.logged).",
    )
    is_active: bool = Field(
        default=True,
        description="Enable or disable without deleting.",
    )
    secret: str | None = Field(
        default=None,
        max_length=255,
        description="HMAC secret for verifying inbound payloads.",
    )


class WebhookEndpoint(WebhookEndpointBase, table=True):
    """Inbound or outbound webhook configuration."""

    __tablename__ = "webhook_endpoint"
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        description="Primary key.",
    )
    owner_id: uuid.UUID = Field(
        foreign_key="user.id",
        nullable=False,
        ondelete="CASCADE",
        description="Owner user; cascades on delete.",
    )
    api_key: str = Field(
        max_length=255,
        description="Key required to authenticate inbound webhook requests.",
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
        description="When the endpoint was created (UTC).",
    )


class WebhookEndpointPublic(WebhookEndpointBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime


class WebhookEndpointsPublic(SQLModel):
    data: list[WebhookEndpointPublic]
    count: int


class WebhookEndpointCreated(WebhookEndpointPublic):
    api_key: str


class WebhookEventResponse(SQLModel):
    received: bool = True
    matched: bool = False
    channel: str | None = None
    contact_id: str | None = None
    interaction_id: str | None = None
    call_status: str | None = None
    error: str | None = None


class ActivityLog(SQLModel, table=True):
    """Immutable record of a create/update/delete on any audited entity."""

    __tablename__ = "activity_log"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    owner_id: uuid.UUID = Field(
        foreign_key="user.id",
        nullable=False,
        ondelete="CASCADE",
        index=True,
    )
    actor_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="user.id",
        nullable=True,
        index=True,
    )
    entity_type: str = Field(max_length=64)
    entity_id: uuid.UUID = Field(index=True)
    action: str = Field(max_length=32)
    changes_json: dict | None = Field(
        default=None,
        sa_column=sa.Column("changes_json", JSONB, nullable=True),
    )
    acting_api_key_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="api_key.id",
        nullable=True,
        ondelete="SET NULL",
        index=True,
    )
    occurred_at: datetime = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),
        nullable=False,
    )


class ActivityLogPublic(SQLModel):
    id: uuid.UUID
    owner_id: uuid.UUID
    actor_id: uuid.UUID | None
    entity_type: str
    entity_id: uuid.UUID
    action: str
    changes_json: dict | None
    occurred_at: datetime


class ActivityLogsPublic(SQLModel):
    data: list[ActivityLogPublic]
    count: int


# Generic message
# ─── EmailOAuthToken ─────────────────────────────────────────────────────────


class EmailOAuthTokenBase(SQLModel):
    """Encrypted OAuth tokens for Gmail API access."""

    provider: str = Field(
        default="gmail",
        max_length=50,
        description="OAuth provider name (e.g. 'gmail').",
    )
    email_address: str = Field(
        max_length=255,
        description="The email address these tokens are for.",
    )
    encrypted_access_token: str = Field(
        description="Encrypted access token for the Gmail API.",
    )
    encrypted_refresh_token: str | None = Field(
        default=None,
        description="Encrypted refresh token for obtaining new access tokens.",
    )
    token_expires_at: datetime | None = Field(
        default=None,
        description="When the access token expires (UTC).",
    )


class EmailOAuthTokenCreate(EmailOAuthTokenBase):
    pass


class EmailOAuthTokenUpdate(SQLModel):
    encrypted_access_token: str | None = None
    encrypted_refresh_token: str | None = None
    token_expires_at: datetime | None = None


class EmailOAuthToken(EmailOAuthTokenBase, table=True):
    """Stored OAuth tokens for a contact's email account."""

    __tablename__ = "email_oauth_token"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        description="Primary key.",
    )
    owner_id: uuid.UUID = Field(
        foreign_key="user.id",
        nullable=False,
        ondelete="CASCADE",
        description="User who owns this token; cascades on delete.",
    )
    contact_id: uuid.UUID = Field(
        foreign_key="contact.id",
        nullable=False,
        ondelete="CASCADE",
        description="Contact these tokens belong to; cascades on delete.",
    )
    created_at: datetime = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),
        nullable=False,
        description="When the token was first stored (UTC).",
    )
    updated_at: datetime = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),
        nullable=False,
        description="Auto-bumped on token refresh (UTC).",
    )


class EmailOAuthTokenPublic(EmailOAuthTokenBase):
    id: uuid.UUID
    contact_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class EmailOAuthTokensPublic(SQLModel):
    data: list[EmailOAuthTokenPublic]
    count: int


# ─── IcalImportLog ───────────────────────────────────────────────────────


class IcalImportLog(SQLModel, table=True):
    """Tracks imported iCal events for UID-based deduplication."""

    __tablename__ = "ical_import_log"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    owner_id: uuid.UUID = Field(
        foreign_key="user.id",
        nullable=False,
        ondelete="CASCADE",
        index=True,
        description="Owner user; cascades on delete.",
    )
    uid: str = Field(
        max_length=2048,
        index=True,
        description="VEVENT.UID from the iCalendar file.",
    )
    contact_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="contact.id",
        ondelete="CASCADE",
        description="Primary contact linked to this event (if any).",
    )
    event_type: str = Field(
        max_length=50,
        description="Classification: interaction, birthday, anniversary, etc.",
    )
    imported_at: datetime = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),
        nullable=False,
        description="When this event was imported (UTC).",
    )

    __table_args__ = (
        sa.UniqueConstraint("owner_id", "uid", name="uq_ical_import_owner_uid"),
    )


class IcalImportLogPublic(SQLModel):
    id: uuid.UUID
    uid: str
    contact_id: uuid.UUID | None
    event_type: str
    imported_at: datetime


# ─── Auth / Utility ──────────────────────────────────────────────────────────


class Message(SQLModel):
    message: str


# JSON payload containing access token
class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


# Contents of JWT token
class TokenPayload(SQLModel):
    sub: str | None = None


class NewPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


class CalendarTokenCreate(SQLModel):
    expires_at: datetime | None = None


class CalendarToken(SQLModel, table=True):
    __tablename__ = "calendar_token"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    token: str = Field(max_length=255)
    status: str = Field(default="active", max_length=20)
    expires_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    last_used_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    revoked_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    created_at: datetime = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),
        nullable=False,
    )


class CalendarTokenPublic(SQLModel):
    id: uuid.UUID
    token: str
    status: str
    owner_id: uuid.UUID
    expires_at: datetime | None = None
    created_at: datetime


class CalendarTokensPublic(SQLModel):
    data: list[CalendarTokenPublic]
    count: int


class CalendarEntry(SQLModel):
    contact_id: uuid.UUID
    name: str
    type: str
    age: int | None


class CalendarMonthResponse(SQLModel):
    month: str
    days: dict[str, list[CalendarEntry]]


class Ok(SQLModel):
    ok: bool = True
