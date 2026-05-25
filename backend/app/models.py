import enum
import uuid
from decimal import Decimal

from datetime import date, datetime, timezone

import sqlalchemy as sa
from pydantic import EmailStr
from sqlalchemy import JSON, DateTime
from sqlmodel import Field, Relationship, SQLModel
from sqlmodel import Relationship as SQLMRelationship  # alias; avoids shadowing by the Relationship table model below
from app.models_vcard_conflict import VCardConflict, VCardConflictBase, VCardConflictPublic, VCardConflictsPublic  # noqa: F401


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
        sa_column=sa.Column("filter_json", JSON, nullable=False),
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
