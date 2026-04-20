import enum
import uuid
from datetime import date, datetime, timezone

import sqlalchemy as sa
from pydantic import EmailStr
from sqlalchemy import DateTime
from sqlmodel import Field, Relationship, SQLModel


def get_datetime_utc() -> datetime:
    return datetime.now(timezone.utc)


# Shared properties
class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)


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
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str | None = None  # nullable: OIDC users have no password
    oidc_iss: str | None = Field(default=None, max_length=512, index=True)
    oidc_sub: str | None = Field(default=None, max_length=255, index=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
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


# ─── Enums ────────────────────────────────────────────────────────────────────


class ContactFieldType(str, enum.Enum):
    EMAIL = "email"
    PHONE = "phone"


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


class MediaCategory(str, enum.Enum):
    MOVIE = "movie"
    TV_SHOW = "tv_show"
    PODCAST = "podcast"
    MUSICIAN = "musician"
    BOOK = "book"
    OTHER = "other"


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
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), nullable=False
    )


class TagPublic(TagBase):
    id: uuid.UUID
    created_at: datetime


class TagsPublic(SQLModel):
    data: list[TagPublic]
    count: int


# ─── ContactTag (junction) ───────────────────────────────────────────────────


class ContactTag(SQLModel, table=True):
    __tablename__ = "contact_tag"
    contact_id: uuid.UUID = Field(
        foreign_key="contact.id", primary_key=True, ondelete="CASCADE"
    )
    tag_id: uuid.UUID = Field(
        foreign_key="tag.id", primary_key=True, ondelete="CASCADE"
    )


# ─── TagShare (grant access to rows bearing a tag) ───────────────────────────────


class TagShare(SQLModel, table=True):
    __tablename__ = "tag_share"
    tag_id: uuid.UUID = Field(
        foreign_key="tag.id", primary_key=True, ondelete="CASCADE"
    )
    grantee_id: uuid.UUID = Field(
        foreign_key="user.id", primary_key=True, ondelete="CASCADE"
    )
    created_at: datetime = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )


class TagSharePublic(SQLModel):
    tag_id: uuid.UUID
    grantee_id: uuid.UUID
    grantee_email: str
    created_at: datetime


class TagSharesPublic(SQLModel):
    data: list[TagSharePublic]
    count: int


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
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), nullable=False
    )


class GroupPublic(GroupBase):
    id: uuid.UUID
    created_at: datetime


class GroupsPublic(SQLModel):
    data: list[GroupPublic]
    count: int


# ─── ContactGroup (junction) ─────────────────────────────────────────────────


class ContactGroup(SQLModel, table=True):
    __tablename__ = "contact_group"
    contact_id: uuid.UUID = Field(
        foreign_key="contact.id", primary_key=True, ondelete="CASCADE"
    )
    group_id: uuid.UUID = Field(
        foreign_key="group.id", primary_key=True, ondelete="CASCADE"
    )


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
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    # Raw vCard text for CardDAV round-trip fidelity
    vcard_raw: str | None = Field(default=None)
    vcard_etag: str | None = Field(default=None, max_length=255)
    # Avatar stored as file path or URL
    avatar_url: str | None = Field(default=None, max_length=2048)
    # Computed: last time any interaction was logged with this contact
    last_contacted_at: datetime | None = None
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column_kwargs={"onupdate": lambda: datetime.now(timezone.utc)},
        nullable=False,
    )
    # Relationships
    tags: list["Tag"] = Relationship(
        back_populates=None,
        link_model=ContactTag,
    )
    groups: list["Group"] = Relationship(
        back_populates=None,
        link_model=ContactGroup,
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
    __tablename__ = "contact_field"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    contact_id: uuid.UUID = Field(
        foreign_key="contact.id", nullable=False, ondelete="CASCADE"
    )


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
    contact_id: uuid.UUID = Field(
        foreign_key="contact.id", nullable=False, ondelete="CASCADE"
    )


class AddressPublic(AddressBase):
    id: uuid.UUID
    contact_id: uuid.UUID


# ─── Relationship ────────────────────────────────────────────────────────────


class RelationshipBase(SQLModel):
    relationship_type: str = Field(
        max_length=100
    )  # spouse, child, parent, friend, colleague, etc.
    notes: str | None = Field(default=None, max_length=1000)


class RelationshipCreate(RelationshipBase):
    contact_id: uuid.UUID  # "from" contact
    related_contact_id: uuid.UUID  # "to" contact


class RelationshipUpdate(SQLModel):
    relationship_type: str | None = None
    notes: str | None = None


class Relationship(RelationshipBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    contact_id: uuid.UUID = Field(
        foreign_key="contact.id", nullable=False, ondelete="CASCADE"
    )
    related_contact_id: uuid.UUID = Field(
        foreign_key="contact.id", nullable=False, ondelete="CASCADE"
    )


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
    contact_id: uuid.UUID = Field(
        foreign_key="contact.id", nullable=False, ondelete="CASCADE"
    )


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
    field_type: str = Field(
        max_length=50, default="text"
    )  # text, number, date, boolean, select
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
    __tablename__ = "custom_field_definition"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), nullable=False
    )


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
    __tablename__ = "custom_field_value"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    contact_id: uuid.UUID = Field(
        foreign_key="contact.id", nullable=False, ondelete="CASCADE"
    )
    field_definition_id: uuid.UUID = Field(
        foreign_key="custom_field_definition.id", nullable=False, ondelete="CASCADE"
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
    contact_id: uuid.UUID = Field(
        foreign_key="contact.id", nullable=False, ondelete="CASCADE"
    )
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), nullable=False
    )


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
    contact_id: uuid.UUID | None = Field(
        default=None, foreign_key="contact.id", ondelete="CASCADE"
    )
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    last_sent_at: datetime | None = None
    snoozed_until: datetime | None = None
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), nullable=False
    )


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
    gift_date: date | None = Field(default=None)
    value_amount: float | None = Field(default=None)
    value_currency: str = Field(default="USD", max_length=3)
    url: str | None = Field(default=None, max_length=2048)


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


class Gift(GiftBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    contact_id: uuid.UUID = Field(
        foreign_key="contact.id", nullable=False, ondelete="CASCADE"
    )
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    gift_date: date | None = Field(
        default=None, sa_column=sa.Column("date", sa.Date, nullable=True)
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), nullable=False
    )


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
    contact_id: uuid.UUID = Field(
        foreign_key="contact.id", nullable=False, ondelete="CASCADE"
    )
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), nullable=False
    )


class DebtPublic(DebtBase):
    id: uuid.UUID
    contact_id: uuid.UUID
    created_at: datetime


class DebtsPublic(SQLModel):
    data: list[DebtPublic]
    count: int


# ─── LifeEvent ────────────────────────────────────────────────────────────────


class LifeEventBase(SQLModel):
    event_type: str = Field(
        max_length=100
    )  # job_change, move, wedding, baby, graduation, etc.
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
    __tablename__ = "life_event"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    contact_id: uuid.UUID = Field(
        foreign_key="contact.id", nullable=False, ondelete="CASCADE"
    )
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), nullable=False
    )


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
    contact_id: uuid.UUID = Field(
        foreign_key="contact.id", nullable=False, ondelete="CASCADE"
    )
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), nullable=False
    )
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


# ─── MediaRecommendation (per-contact media suggestions) ─────────────────────


class MediaRecommendationBase(SQLModel):
    category: MediaCategory
    title: str = Field(min_length=1, max_length=500)
    creator: str | None = Field(default=None, max_length=500)
    note: str | None = Field(default=None, max_length=5000)
    recommended_at: date | None = Field(default=None)


class MediaRecommendationCreate(MediaRecommendationBase):
    contact_id: uuid.UUID


class MediaRecommendationUpdate(SQLModel):
    category: MediaCategory | None = None
    title: str | None = None
    creator: str | None = None
    note: str | None = None
    recommended_at: date | None = None


class MediaRecommendation(MediaRecommendationBase, table=True):
    __tablename__ = "media_recommendation"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    contact_id: uuid.UUID = Field(
        foreign_key="contact.id", nullable=False, ondelete="CASCADE"
    )
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column_kwargs={"onupdate": lambda: datetime.now(timezone.utc)},
        nullable=False,
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
    __tablename__ = "journal_entry"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), nullable=False
    )
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
    __tablename__ = "webhook_endpoint"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    api_key: str = Field(max_length=255)  # for authenticating inbound webhooks
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), nullable=False
    )


# Generic message
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
