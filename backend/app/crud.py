import re
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import union
from sqlmodel import Session, select
from sqlmodel import delete as sql_delete

from app.core.security import get_password_hash, verify_password

# Import relationship-specific CRUD functions
from app.models import (
    Address,
    AddressCreate,
    APIKey,
    APIKeyCreate,
    APIKeyImpersonate,
    Contact,
    ContactCreate,
    ContactField,
    ContactFieldCreate,
    ContactStageEvent,
    ContactStageEventCreate,
    ContactTag,
    CustomFieldDefinition,
    CustomFieldDefinitionCreate,
    CustomFieldValue,
    CustomFieldValueCreate,
    Debt,
    DebtCreate,
    Gift,
    GiftCreate,
    Interaction,
    InteractionAttendee,
    InteractionCreate,
    JournalEntry,
    JournalEntryContact,
    JournalEntryCreate,
    LifeEvent,
    LifeEventCreate,
    MediaRecommendation,
    MediaRecommendationCreate,
    Note,
    NoteCreate,
    NoteMention,
    NoteUpdate,
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
    session.refresh(db_obj)
    return db_obj


# ─── Tag CRUD ──────────────────────────────────────────────────────────────────


def create_tag(*, session: Session, tag_in: TagCreate, owner_id: uuid.UUID) -> Tag:
    db_obj = Tag.model_validate(tag_in, update={"owner_id": owner_id})
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
    *,
    session: Session,
    relationship_in: RelationshipCreate,
    inverse_type: str | None = None,
) -> Relationship:
    db_obj = Relationship.model_validate(relationship_in)
    session.add(db_obj)
    if inverse_type:
        inverse = Relationship(
            contact_id=relationship_in.related_contact_id,
            related_contact_id=relationship_in.contact_id,
            relationship_type=inverse_type,
            notes=relationship_in.notes,
        )
        session.add(inverse)
        session.flush()  # materialise IDs before cross-linking
        db_obj.inverse_id = inverse.id
        inverse.inverse_id = db_obj.id
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


def recompute_last_contacted_at(*, session: Session, contact_id: uuid.UUID) -> None:
    """Reset contact.last_contacted_at to the most recent attended interaction."""
    contact = session.get(Contact, contact_id)
    if contact is None:
        return
    stmt = (
        select(Interaction.occurred_at)
        .join(
            InteractionAttendee,
            InteractionAttendee.interaction_id == Interaction.id,  # type: ignore[arg-type]
        )
        .where(InteractionAttendee.contact_id == contact_id)
        .where(Interaction.is_draft == False)  # noqa: E712
        .order_by(Interaction.occurred_at.desc())
        .limit(1)
    )
    latest = session.exec(stmt).first()
    contact.last_contacted_at = latest
    session.add(contact)


def create_interaction(
    *,
    session: Session,
    interaction_in: InteractionCreate,
    owner_id: uuid.UUID,
) -> Interaction:
    db_obj = Interaction.model_validate(
        interaction_in,
        update={"owner_id": owner_id},
    )
    session.add(db_obj)
    for attendee_id in set(interaction_in.attendee_ids):
        session.add(
            InteractionAttendee(interaction_id=db_obj.id, contact_id=attendee_id)
        )
        # Drafts do not affect last_contacted_at; only confirmed interactions do.
        if not db_obj.is_draft:
            contact = session.get(Contact, attendee_id)
            if contact and (
                contact.last_contacted_at is None
                or db_obj.occurred_at > contact.last_contacted_at
            ):
                contact.last_contacted_at = db_obj.occurred_at
                session.add(contact)
    session.commit()
    session.refresh(db_obj)
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


# ─── MediaRecommendation CRUD ─────────────────────────────────────────────────


def create_media_recommendation(
    *, session: Session, rec_in: MediaRecommendationCreate, owner_id: uuid.UUID
) -> MediaRecommendation:
    db_obj = MediaRecommendation.model_validate(rec_in, update={"owner_id": owner_id})
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


# ─── Note CRUD ─────────────────────────────────────────────────────────────────


_MENTION_RE = re.compile(r"@\[[^\]]+\]\(([a-f0-9-]{36})\)")


def _extract_mention_ids(body: str | None) -> set[uuid.UUID]:
    if not body:
        return set()
    ids: set[uuid.UUID] = set()
    for raw in _MENTION_RE.findall(body):
        try:
            ids.add(uuid.UUID(raw))
        except ValueError:
            continue
    return ids


def _sync_note_mentions(*, session: Session, note: Note) -> None:
    session.exec(sql_delete(NoteMention).where(NoteMention.note_id == note.id))
    for cid in _extract_mention_ids(note.body):
        session.add(NoteMention(note_id=note.id, contact_id=cid))


def create_note(*, session: Session, note_in: NoteCreate, owner_id: uuid.UUID) -> Note:
    db_obj = Note.model_validate(note_in, update={"owner_id": owner_id})
    session.add(db_obj)
    session.flush()
    _sync_note_mentions(session=session, note=db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def update_note(*, session: Session, note: Note, note_in: NoteUpdate) -> Note:
    update_data = note_in.model_dump(exclude_unset=True)
    note.sqlmodel_update(update_data)
    session.add(note)
    session.flush()
    if "body" in update_data:
        _sync_note_mentions(session=session, note=note)
    session.commit()
    session.refresh(note)
    return note


# ─── JournalEntry CRUD ────────────────────────────────────────────────────────


def create_journal_entry(
    *, session: Session, journal_in: JournalEntryCreate, owner_id: uuid.UUID
) -> JournalEntry:
    db_obj = JournalEntry.model_validate(journal_in, update={"owner_id": owner_id})
    session.add(db_obj)
    session.flush()
    # Sync contact associations
    if journal_in.contact_ids:
        for cid in set(journal_in.contact_ids):
            session.add(JournalEntryContact(journal_entry_id=db_obj.id, contact_id=cid))
    session.commit()
    session.refresh(db_obj)
    return db_obj


# ─── Visibility helpers ───────────────────────────────────────────────────────


def visible_contact_ids(user: User, *, include_deleted: bool = False) -> Any:
    """Subquery: contact IDs visible to user (owned OR tag-shared).

    Soft-deleted contacts (`deleted_at` set) are hidden by default. Pass
    ``include_deleted=True`` to surface them — used by the trash/restore flow.
    """
    owned = select(Contact.id).where(Contact.owner_id == user.id)
    shared = (
        select(ContactTag.contact_id)
        .join(TagShare, TagShare.tag_id == ContactTag.tag_id)  # type: ignore[arg-type]
        .join(Contact, Contact.id == ContactTag.contact_id)  # type: ignore[arg-type]
        .where(TagShare.grantee_id == user.id)
    )
    if not include_deleted:
        owned = owned.where(Contact.deleted_at.is_(None))
        shared = shared.where(Contact.deleted_at.is_(None))
    return union(owned, shared)


def contact_visible(
    *,
    session: Session,
    user: User,
    contact_id: uuid.UUID,
    include_deleted: bool = False,
) -> bool:
    """True if `user` may read/write the given contact via ownership or tag share."""
    stmt = select(Contact.id).where(
        Contact.id == contact_id,
        Contact.id.in_(visible_contact_ids(user, include_deleted=include_deleted)),
    )
    return session.exec(stmt).first() is not None



# ─── ReminderSnooze helpers ──────────────────────────────────────────────


def get_effective_snoozed_until(*, session: Session, reminder_id: uuid.UUID) -> datetime | None:
    """Derive effective snoozed_until from latest reminder_snooze row."""
    from app.models import ReminderSnooze

    stmt = (
        select(ReminderSnooze)
        .where(ReminderSnooze.reminder_id == reminder_id)
        .order_by(ReminderSnooze.snoozed_at.desc())
        .limit(1)
    )
    latest = session.exec(stmt).first()
    return latest.snoozed_until if latest else None


def get_snooze_count(*, session: Session, reminder_id: uuid.UUID, days: int = 30) -> int:
    """Count snooze events for a reminder in the last N days."""
    from datetime import timedelta

    from app.models import ReminderSnooze

    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    stmt = (
        select(func.count())
        .select_from(ReminderSnooze)
        .where(
            ReminderSnooze.reminder_id == reminder_id,
            ReminderSnooze.snoozed_at >= cutoff,
        )
    )
    return session.exec(stmt).one()


def get_chronic_snooze_contacts(
    *, session: Session, owner_id: uuid.UUID, days: int = 7, threshold: int = 3
) -> list[dict]:
    """Find contacts with >threshold snoozed reminders in the past N days.

    Returns list of dicts with contact_id, contact_name, snooze_count.
    """
    from datetime import timedelta

    from app.models import Contact, Reminder, ReminderSnooze

    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    # Subquery: count snoozes per reminder in the time window
    snooze_subq = (
        select(
            ReminderSnooze.reminder_id,
            func.count().label("snooze_count"),
        )
        .where(ReminderSnooze.snoozed_at >= cutoff)
        .group_by(ReminderSnooze.reminder_id)
        .subquery()
    )
    # Join to reminders and contacts, filter by owner and threshold
    stmt = (
        select(
            Contact.id.label("contact_id"),
            Contact.first_name,
            Contact.last_name,
            func.sum(snooze_subq.c.snooze_count).label("total_snoozes"),
        )
        .join(Reminder, Reminder.contact_id == Contact.id)
        .join(snooze_subq, snooze_subq.c.reminder_id == Reminder.id)
        .where(Reminder.owner_id == owner_id)
        .group_by(Contact.id, Contact.first_name, Contact.last_name)
        .having(func.sum(snooze_subq.c.snooze_count) > threshold)
        .order_by(func.sum(snooze_subq.c.snooze_count).desc())
    )
    results = session.exec(stmt).all()
    return [
        {
            "contact_id": r.contact_id,
            "contact_name": f"{r.first_name} {r.last_name or ''}".strip(),
            "snooze_count": r.total_snoozes,
        }
        for r in results
    ]


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


# ─── ContactStageEvent CRUD ──────────────────────────────────────


def create_stage_event(
    *,
    session: Session,
    event_in: ContactStageEventCreate,
    owner_id: uuid.UUID,
) -> ContactStageEvent:
    """Create a stage event and update Contact.stage as a denormalized cache."""
    # Fetch the contact to update its cached stage
    contact = session.get(Contact, event_in.contact_id)
    if contact is None:
        raise ValueError(f"Contact {event_in.contact_id} not found")
    if contact.owner_id != owner_id:
        raise PermissionError("Not the contact owner")

    # Create the event
    db_obj = ContactStageEvent.model_validate(event_in, update={"owner_id": owner_id})
    session.add(db_obj)

    # Update the denormalized stage cache on the contact
    contact.stage = event_in.to_stage
    session.add(contact)

    session.commit()
    session.refresh(db_obj)
    return db_obj


def get_contact_stage_history(
    *,
    session: Session,
    contact_id: uuid.UUID,
    owner_id: uuid.UUID | None = None,
) -> list[ContactStageEvent]:
    """Return all stage events for a contact, newest first."""
    from sqlmodel import select

    stmt = (
        select(ContactStageEvent)
        .where(ContactStageEvent.contact_id == contact_id)
        .order_by(ContactStageEvent.occurred_at.desc())
    )
    if owner_id is not None:
        stmt = stmt.where(ContactStageEvent.owner_id == owner_id)
    return session.exec(stmt).all()


def get_latest_stage_event(
    *,
    session: Session,
    contact_id: uuid.UUID,
    owner_id: uuid.UUID | None = None,
) -> ContactStageEvent | None:
    """Return the most recent stage event for a contact."""
    from sqlmodel import select

    stmt = (
        select(ContactStageEvent)
        .where(ContactStageEvent.contact_id == contact_id)
        .order_by(ContactStageEvent.occurred_at.desc())
        .limit(1)
    )
    if owner_id is not None:
        stmt = stmt.where(ContactStageEvent.owner_id == owner_id)
    return session.exec(stmt).first()


def get_stage_duration(
    *,
    session: Session,
    contact_id: uuid.UUID,
    stage: str,
    owner_id: uuid.UUID | None = None,
) -> list[tuple]:
    """Return (entered_at, exited_at, duration_seconds) for each dwell in `stage`.

    Returns a list of tuples because a contact may re-enter the same stage.
    """

    # Get all events where the contact entered or exited the given stage
    events = get_contact_stage_history(
        session=session, contact_id=contact_id, owner_id=owner_id
    )

    durations = []
    entered_at = None

    for event in events:
        if event.to_stage == stage:
            entered_at = event.occurred_at
        elif event.from_stage == stage and entered_at is not None:
            exited_at = event.occurred_at
            duration = (exited_at - entered_at).total_seconds()
            durations.append((entered_at, exited_at, duration))
            entered_at = None

    # If still in this stage, use now as the end time
    if entered_at is not None:
        from datetime import datetime as dt
        from datetime import timezone

        now = dt.now(timezone.utc)
        duration = (now - entered_at).total_seconds()
        durations.append((entered_at, None, duration))

    return durations


def backfill_stage_events(
    *,
    session: Session,
    owner_id: uuid.UUID | None = None,
) -> int:
    """Backfill seed stage events for contacts that don't have one.

    Creates one event per contact using the current stage and created_at.
    Returns the number of events created.
    """
    from sqlmodel import select

    # Find contacts without a stage event
    stmt = select(Contact)
    if owner_id is not None:
        stmt = stmt.where(Contact.owner_id == owner_id)

    contacts = session.exec(stmt).all()
    created = 0

    for contact in contacts:
        # Check if a seed event already exists
        existing = session.exec(
            select(ContactStageEvent)
            .where(
                ContactStageEvent.contact_id == contact.id,
                ContactStageEvent.from_stage.is_(None),
            )
            .limit(1)
        ).first()

        if existing is not None:
            continue

        # Create seed event
        event = ContactStageEvent(
            contact_id=contact.id,
            owner_id=contact.owner_id,
            from_stage=None,
            to_stage=contact.stage,
            occurred_at=contact.created_at,
            note="Seed event: initial stage on contact creation",
        )
        session.add(event)
        created += 1

    session.commit()
    return created


# ─── API Keys ─────────────────────────────────────────────────────────────────


def create_api_key(
    *, session: Session, owner_id: uuid.UUID, key_in: APIKeyCreate
) -> tuple[APIKey, str]:
    """Create a new API key, returning the model and the plaintext token."""
    from app.core.api_keys import generate_key

    plaintext, key_hash, key_prefix = generate_key()
    api_key = APIKey(
        name=key_in.name,
        key_hash=key_hash,
        key_prefix=key_prefix,
        owned_by_user_id=owner_id,
        expires_at=key_in.expires_at,
    )
    session.add(api_key)
    session.flush()  # get api_key.id before adding impersonation rows

    for user_id in key_in.can_impersonate:
        session.add(APIKeyImpersonate(api_key_id=api_key.id, user_id=user_id))

    session.commit()
    session.refresh(api_key)
    return api_key, plaintext


def list_api_keys(*, session: Session, owner_id: uuid.UUID) -> list[APIKey]:
    return list(
        session.exec(select(APIKey).where(APIKey.owned_by_user_id == owner_id)).all()
    )


def revoke_api_key(*, session: Session, api_key: APIKey) -> None:
    from datetime import datetime, timezone

    api_key.revoked_at = datetime.now(timezone.utc)
    session.add(api_key)
    session.commit()


def get_api_key_impersonate_targets(
    *, session: Session, api_key_id: uuid.UUID
) -> list[uuid.UUID]:
    rows = session.exec(
        select(APIKeyImpersonate).where(APIKeyImpersonate.api_key_id == api_key_id)
    ).all()
    return [r.user_id for r in rows]


def get_api_key_by_hash(*, session: Session, key_hash: str) -> APIKey | None:
    return session.exec(select(APIKey).where(APIKey.key_hash == key_hash)).first()


def get_api_key_by_plaintext(*, session: Session, plaintext: str) -> APIKey | None:
    from datetime import datetime, timezone

    from app.core.api_keys import hash_key

    api_key = get_api_key_by_hash(session=session, key_hash=hash_key(plaintext))
    if api_key is None:
        return None
    if api_key.revoked_at is not None:
        return None
    if api_key.expires_at is not None and api_key.expires_at < datetime.now(
        timezone.utc
    ):
        return None
    return api_key
