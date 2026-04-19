import uuid
from typing import Any

from sqlalchemy import union
from sqlmodel import Session, select

from app.core.security import get_password_hash, verify_password
from app.models import (
    Address,
    AddressCreate,
    Contact,
    ContactCreate,
    ContactField,
    ContactFieldCreate,
    ContactGroup,
    ContactTag,
    Debt,
    DebtCreate,
    Gift,
    GiftCreate,
    Group,
    GroupCreate,
    Interaction,
    InteractionCreate,
    LifeEvent,
    LifeEventCreate,
    Note,
    NoteCreate,
    Pet,
    PetCreate,
    Relationship,
    RelationshipCreate,
    Reminder,
    ReminderCreate,
    Tag,
    TagCreate,
    TagShare,
    User,
    UserCreate,
    UserUpdate,
    CustomFieldDefinition,
    CustomFieldDefinitionCreate,
    CustomFieldValue,
    CustomFieldValueCreate,
    JournalEntry,
    JournalEntryCreate,
)


def create_user(*, session: Session, user_create: UserCreate) -> User:
    db_obj = User.model_validate(
        user_create, update={"hashed_password": get_password_hash(user_create.password)}
    )
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def update_user(*, session: Session, db_user: User, user_in: UserUpdate) -> Any:
    user_data = user_in.model_dump(exclude_unset=True)
    extra_data = {}
    if "password" in user_data:
        password = user_data["password"]
        hashed_password = get_password_hash(password)
        extra_data["hashed_password"] = hashed_password
    db_user.sqlmodel_update(user_data, update=extra_data)
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user


def get_user_by_email(*, session: Session, email: str) -> User | None:
    statement = select(User).where(User.email == email)
    session_user = session.exec(statement).first()
    return session_user


# Dummy hash to use for timing attack prevention when user is not found
# This is an Argon2 hash of a random password, used to ensure constant-time comparison
DUMMY_HASH = "$argon2id$v=19$m=65536,t=3,p=4$MjQyZWE1MzBjYjJlZTI0Yw$YTU4NGM5ZTZmYjE2NzZlZjY0ZWY3ZGRkY2U2OWFjNjk"


def authenticate(*, session: Session, email: str, password: str) -> User | None:
    db_user = get_user_by_email(session=session, email=email)
    if not db_user:
        # Prevent timing attacks by running password verification even when user doesn't exist
        # This ensures the response time is similar whether or not the email exists
        verify_password(password, DUMMY_HASH)
        return None
    verified, updated_password_hash = verify_password(password, db_user.hashed_password)
    if not verified:
        return None
    if updated_password_hash:
        db_user.hashed_password = updated_password_hash
        session.add(db_user)
        session.commit()
        session.refresh(db_user)
    return db_user


# ─── Contact CRUD ─────────────────────────────────────────────────────────────


def create_contact(
    *, session: Session, contact_in: ContactCreate, owner_id: uuid.UUID
) -> Contact:
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


# ─── Tag CRUD ──────────────────────────────────────────────────────────────────


def create_tag(*, session: Session, tag_in: TagCreate, owner_id: uuid.UUID) -> Tag:
    db_obj = Tag.model_validate(tag_in, update={"owner_id": owner_id})
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


# ─── Group CRUD ────────────────────────────────────────────────────────────────


def create_group(
    *, session: Session, group_in: GroupCreate, owner_id: uuid.UUID
) -> Group:
    db_obj = Group.model_validate(group_in, update={"owner_id": owner_id})
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


# ─── ContactField CRUD ────────────────────────────────────────────────────────


def create_contact_field(
    *, session: Session, field_in: ContactFieldCreate
) -> ContactField:
    db_obj = ContactField.model_validate(field_in)
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


# ─── Address CRUD ─────────────────────────────────────────────────────────────


def create_address(*, session: Session, address_in: AddressCreate) -> Address:
    db_obj = Address.model_validate(address_in)
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


# ─── Relationship CRUD ────────────────────────────────────────────────────────


def create_relationship(
    *, session: Session, relationship_in: RelationshipCreate
) -> Relationship:
    db_obj = Relationship.model_validate(relationship_in)
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


# ─── Pet CRUD ──────────────────────────────────────────────────────────────────


def create_pet(*, session: Session, pet_in: PetCreate) -> Pet:
    db_obj = Pet.model_validate(pet_in)
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


# ─── CustomFieldDefinition CRUD ────────────────────────────────────────────────


def create_custom_field_definition(
    *, session: Session, field_def_in: CustomFieldDefinitionCreate, owner_id: uuid.UUID
) -> CustomFieldDefinition:
    db_obj = CustomFieldDefinition.model_validate(
        field_def_in, update={"owner_id": owner_id}
    )
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


# ─── CustomFieldValue CRUD ────────────────────────────────────────────────────


def create_custom_field_value(
    *, session: Session, field_value_in: CustomFieldValueCreate
) -> CustomFieldValue:
    db_obj = CustomFieldValue.model_validate(field_value_in)
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


# ─── Interaction CRUD ────────────────────────────────────────────────────────


def create_interaction(
    *, session: Session, interaction_in: InteractionCreate, owner_id: uuid.UUID
) -> Interaction:
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


# ─── Reminder CRUD ────────────────────────────────────────────────────────────


def create_reminder(
    *, session: Session, reminder_in: ReminderCreate, owner_id: uuid.UUID
) -> Reminder:
    db_obj = Reminder.model_validate(reminder_in, update={"owner_id": owner_id})
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


# ─── Gift CRUD ─────────────────────────────────────────────────────────────────


def create_gift(*, session: Session, gift_in: GiftCreate, owner_id: uuid.UUID) -> Gift:
    db_obj = Gift.model_validate(gift_in, update={"owner_id": owner_id})
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


# ─── Debt CRUD ─────────────────────────────────────────────────────────────────


def create_debt(*, session: Session, debt_in: DebtCreate, owner_id: uuid.UUID) -> Debt:
    db_obj = Debt.model_validate(debt_in, update={"owner_id": owner_id})
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


# ─── LifeEvent CRUD ────────────────────────────────────────────────────────────


def create_life_event(
    *, session: Session, life_event_in: LifeEventCreate, owner_id: uuid.UUID
) -> LifeEvent:
    db_obj = LifeEvent.model_validate(life_event_in, update={"owner_id": owner_id})
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


# ─── Note CRUD ─────────────────────────────────────────────────────────────────


def create_note(*, session: Session, note_in: NoteCreate, owner_id: uuid.UUID) -> Note:
    db_obj = Note.model_validate(note_in, update={"owner_id": owner_id})
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


# ─── JournalEntry CRUD ────────────────────────────────────────────────────────


def create_journal_entry(
    *, session: Session, journal_in: JournalEntryCreate, owner_id: uuid.UUID
) -> JournalEntry:
    db_obj = JournalEntry.model_validate(journal_in, update={"owner_id": owner_id})
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


# ─── Visibility helpers ───────────────────────────────────────────────────────


def visible_contact_ids(user: User) -> Any:
    """Subquery: contact IDs visible to user (owned OR tag-shared)."""
    owned = select(Contact.id).where(Contact.owner_id == user.id)
    shared = (
        select(ContactTag.contact_id)
        .join(TagShare, TagShare.tag_id == ContactTag.tag_id)  # type: ignore[arg-type]
        .where(TagShare.grantee_id == user.id)
    )
    return union(owned, shared)


def contact_visible(*, session: Session, user: User, contact_id: uuid.UUID) -> bool:
    """True if `user` may read/write the given contact via ownership or tag share."""
    stmt = select(Contact.id).where(
        Contact.id == contact_id,
        Contact.id.in_(visible_contact_ids(user)),
    )
    return session.exec(stmt).first() is not None


def get_or_create_user_from_claims(
    *, session: Session, claims: dict[str, object]
) -> User:
    """Resolve (iss, sub) to a User row; JIT-create on first sight.

    During Phase 1-3 migration, merge onto an existing local User matching
    `email` if `oidc_sub` is still NULL. After Phase 4 this branch is moot.
    """
    iss = str(claims["iss"])
    sub = str(claims["sub"])
    email = str(claims.get("email", "")) or None

    existing = session.exec(
        select(User).where(User.oidc_iss == iss, User.oidc_sub == sub)
    ).first()
    if existing:
        return existing

    if email:
        merge = session.exec(
            select(User).where(User.email == email, User.oidc_sub.is_(None))  # type: ignore[union-attr]
        ).first()
        if merge:
            merge.oidc_iss = iss
            merge.oidc_sub = sub
            session.add(merge)
            session.commit()
            session.refresh(merge)
            return merge

    from app.core.config import settings

    new_user = User(
        email=email or f"{sub}@oidc.invalid",
        full_name=str(claims.get("name", "")) or None,
        is_active=settings.OIDC_JIT_ACTIVE,
        is_superuser=False,
        oidc_iss=iss,
        oidc_sub=sub,
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    return new_user
