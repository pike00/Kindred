"""Generate fake CRM data for local development.

Runs inside the backend container (DB lives on an internal-only docker network).
Use the `just seed` / `just seed-reset` recipes at the repo root.

    python app/seed_fake_data.py --count 500
    python app/seed_fake_data.py --count 500 --reset --email admin@example.com
"""

from __future__ import annotations

import argparse
import logging
import random
import uuid
from collections.abc import Sequence
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import delete as sql_delete
from sqlmodel import Session, select

from app.core.config import settings
from app.core.db import engine
from app.models import (
    Address,
    Contact,
    ContactField,
    ContactFieldType,
    ContactGroup,
    ContactTag,
    Debt,
    DebtDirection,
    Gift,
    GiftStatus,
    Group,
    Interaction,
    InteractionChannel,
    LifeEvent,
    MediaCategory,
    MediaRecommendation,
    Note,
    Pet,
    Relationship,
    Reminder,
    ReminderFrequency,
    Tag,
    User,
)

logging.basicConfig(level=logging.INFO, format="%(message)s")
log = logging.getLogger("seed")

# ─── Curated data pools ──────────────────────────────────────────────────────

FIRST_NAMES = [
    "Alex",
    "Alice",
    "Amelia",
    "Anna",
    "Arjun",
    "Ben",
    "Beth",
    "Cai",
    "Cara",
    "Chen",
    "Chloe",
    "Clara",
    "Daniel",
    "Dante",
    "Diego",
    "Ella",
    "Emma",
    "Ethan",
    "Eva",
    "Farhan",
    "Felix",
    "Finn",
    "Grace",
    "Hannah",
    "Henry",
    "Ian",
    "Ines",
    "Isaac",
    "Isla",
    "Ivy",
    "Jack",
    "Jade",
    "Jamie",
    "Jasper",
    "Jin",
    "Jordan",
    "Julia",
    "Kai",
    "Kavya",
    "Kenji",
    "Kiran",
    "Lara",
    "Leila",
    "Leo",
    "Liam",
    "Lila",
    "Luca",
    "Lucas",
    "Luna",
    "Maria",
    "Mateo",
    "Maya",
    "Mei",
    "Mia",
    "Miguel",
    "Mila",
    "Nadia",
    "Naledi",
    "Nate",
    "Nia",
    "Niko",
    "Nora",
    "Oliver",
    "Olivia",
    "Omar",
    "Priya",
    "Quinn",
    "Raj",
    "Riya",
    "Rosa",
    "Ruby",
    "Sam",
    "Sana",
    "Sara",
    "Sasha",
    "Satoshi",
    "Simi",
    "Sofia",
    "Tariq",
    "Theo",
    "Uma",
    "Vera",
    "Viktor",
    "Willa",
    "Xena",
    "Yara",
    "Yusuf",
    "Zara",
    "Zoe",
]

LAST_NAMES = [
    "Abara",
    "Adams",
    "Ahmed",
    "Alvarez",
    "Andersson",
    "Arora",
    "Bailey",
    "Baker",
    "Bennett",
    "Bhatt",
    "Brown",
    "Cabrera",
    "Cai",
    "Campbell",
    "Chen",
    "Choudhury",
    "Clark",
    "Cohen",
    "Cole",
    "Cruz",
    "Davies",
    "Diaz",
    "Dimitriou",
    "Duarte",
    "Evans",
    "Fernandez",
    "Fischer",
    "Foster",
    "Gao",
    "Garcia",
    "Ghosh",
    "Gonzalez",
    "Green",
    "Haddad",
    "Haile",
    "Hall",
    "Harris",
    "Hassan",
    "Hayes",
    "Hill",
    "Ikeda",
    "Ivanov",
    "Jackson",
    "Jensen",
    "Johnson",
    "Jones",
    "Kapoor",
    "Khan",
    "Kim",
    "Kimura",
    "Kowal",
    "Lee",
    "Lopez",
    "Maeda",
    "Martin",
    "Mendoza",
    "Mitchell",
    "Moore",
    "Morales",
    "Moreau",
    "Nakamura",
    "Nguyen",
    "Njoroge",
    "Novak",
    "Obi",
    "Okafor",
    "Park",
    "Patel",
    "Perez",
    "Peterson",
    "Phillips",
    "Popov",
    "Price",
    "Quinn",
    "Ramos",
    "Reyes",
    "Rizzo",
    "Romero",
    "Sato",
    "Schmidt",
    "Sharma",
    "Silva",
    "Singh",
    "Smith",
    "Suzuki",
    "Tan",
    "Taylor",
    "Thomas",
    "Torres",
    "Vasquez",
    "Wang",
    "Williams",
    "Wilson",
    "Wright",
    "Yamamoto",
    "Zhang",
]

COMPANIES = [
    "Acme",
    "Aurora Labs",
    "Beacon Capital",
    "Cedar Biomedical",
    "Delta Works",
    "Ember Studio",
    "Fjord Dynamics",
    "Globe Logistics",
    "Harbor Analytics",
    "Indigo AI",
    "Junction Press",
    "Kestrel Robotics",
    "Loam Agritech",
    "Mariner Fintech",
    "Nimbus Cloud",
    "Orchard Foods",
    "Pike Systems",
    "Quartz Media",
    "Ridgeline Design",
    "Solstice Energy",
    "Tidepool",
    "Umber",
    "Vanguard Legal",
    "Willow Health",
    "Xavier Biosciences",
    "Yonder Games",
    "Zephyr Aerospace",
]

TITLES = [
    "Software Engineer",
    "Product Manager",
    "Designer",
    "Data Analyst",
    "Accountant",
    "Nurse",
    "Teacher",
    "Architect",
    "Consultant",
    "Founder",
    "Lawyer",
    "Marketer",
    "Writer",
    "Photographer",
    "Chef",
    "Electrician",
    "Researcher",
    "VP Engineering",
    "Head of Ops",
    "Recruiter",
    "Physician",
    "Veterinarian",
    "Mechanic",
    "Civil Engineer",
    "UX Researcher",
]

DEPARTMENTS = [
    "Engineering",
    "Design",
    "Marketing",
    "Sales",
    "Operations",
    "Finance",
    "Legal",
    "HR",
    "Research",
    None,
    None,
    None,
]

CITIES = [
    ("Seattle", "WA"),
    ("Portland", "OR"),
    ("San Francisco", "CA"),
    ("Los Angeles", "CA"),
    ("Denver", "CO"),
    ("Austin", "TX"),
    ("Dallas", "TX"),
    ("Chicago", "IL"),
    ("Minneapolis", "MN"),
    ("Boston", "MA"),
    ("New York", "NY"),
    ("Brooklyn", "NY"),
    ("Philadelphia", "PA"),
    ("Atlanta", "GA"),
    ("Miami", "FL"),
    ("Nashville", "TN"),
    ("Washington", "DC"),
    ("Toronto", "ON"),
    ("Vancouver", "BC"),
    ("London", None),
    ("Berlin", None),
    ("Amsterdam", None),
    ("Lisbon", None),
    ("Tokyo", None),
    ("Singapore", None),
    ("Sydney", None),
]

STREETS = [
    "Main St",
    "Oak Ave",
    "Pine St",
    "Maple Ave",
    "Cedar Ln",
    "Elm St",
    "Birch Rd",
    "Chestnut Ave",
    "Washington Blvd",
    "Lincoln Ave",
    "Park St",
    "Lake Dr",
    "River Rd",
    "Summit Way",
    "Hillside Ct",
    "Meadow Ln",
]

TAG_SPECS = [
    ("Family", "#ef4444"),
    ("Close Friends", "#f97316"),
    ("Work", "#3b82f6"),
    ("College", "#8b5cf6"),
    ("High School", "#a855f7"),
    ("Book Club", "#10b981"),
    ("Climbing", "#14b8a6"),
    ("Running Group", "#06b6d4"),
    ("Neighbor", "#84cc16"),
    ("VIP", "#eab308"),
    ("Mentor", "#f59e0b"),
    ("Mentee", "#d97706"),
    ("Referral", "#ec4899"),
    ("Client", "#0ea5e9"),
    ("Vendor", "#64748b"),
    ("Investor", "#22c55e"),
    ("Networking", "#6366f1"),
    ("Band", "#dc2626"),
    ("Travel", "#0891b2"),
    ("Kids' Parents", "#f43f5e"),
]

GROUP_SPECS = [
    ("Immediate Family", "Parents, siblings, spouse, kids"),
    ("Extended Family", "Aunts, uncles, cousins, in-laws"),
    ("College Friends", "Undergrad cohort and dorm friends"),
    ("Work — Current Team", "People on my current team"),
    ("Work — Past Colleagues", "Former coworkers worth staying in touch with"),
    ("Climbing Crew", "Weekly indoor climbing partners"),
    ("Book Club", "Monthly book club members"),
    ("Neighbors", "People on the block"),
    ("Investors & Advisors", "Cap table, board, advisory"),
    ("Band Practice", None),
]

RELATIONSHIP_TYPES = [
    "spouse",
    "partner",
    "parent",
    "child",
    "sibling",
    "grandparent",
    "in-law",
    "cousin",
    "friend",
    "colleague",
    "mentor",
    "mentee",
    "roommate",
    "neighbor",
]

LIFE_EVENTS = [
    ("job_change", "Started new role"),
    ("job_change", "Promoted"),
    ("move", "Moved to new city"),
    ("wedding", "Got married"),
    ("baby", "Had a kid"),
    ("graduation", "Graduated"),
    ("loss", "Lost a parent"),
    ("health", "Recovered from surgery"),
    ("milestone", "Ran first marathon"),
    ("milestone", "Bought first home"),
]

PET_NAMES = [
    "Rufus",
    "Biscuit",
    "Luna",
    "Milo",
    "Bella",
    "Charlie",
    "Daisy",
    "Finn",
    "Hazel",
    "Oreo",
    "Peanut",
    "Pepper",
    "Scout",
    "Simba",
    "Willow",
]

PET_SPECIES = [
    ("dog", ["Labrador", "Golden Retriever", "Poodle", "Mutt", "Corgi", "Shiba"]),
    ("cat", ["Tabby", "Maine Coon", "Siamese", "Ragdoll", "Shorthair"]),
    ("rabbit", ["Dwarf", "Lop"]),
    ("bird", ["Parakeet", "Cockatiel"]),
]

INTERACTION_NOTES = [
    "Caught up over coffee.",
    "Quick check-in call.",
    "Texted about weekend plans.",
    "Lunch near the office.",
    "Video call — walked through demo.",
    "Drinks after work.",
    "Ran into each other at the grocery store.",
    "Birthday call.",
    "Sent a long email catching up.",
    "Hiked the ridge trail.",
    "Helped them move.",
    "Debugged their deployment.",
    "Talked through a career decision.",
    "",
    "",
    "",
]

GIFT_IDEAS = [
    "Artisan coffee subscription",
    "Hand-thrown ceramic mug",
    "Used bookshop gift card",
    "Board game",
    "Linen napkins",
    "Local honey sampler",
    "Cast iron pan",
    "Climbing gym day pass",
    "Wool socks",
    "Leather keychain",
    "Plant",
    "Vinyl record",
    "Bottle of olive oil",
    "Cookbook",
]

OCCASIONS = [
    "Birthday",
    "Christmas",
    "Hanukkah",
    "Housewarming",
    "Wedding",
    "New baby",
    "Just because",
    "Anniversary",
]

MEDIA_ITEMS: list[tuple[MediaCategory, str, str | None]] = [
    (MediaCategory.MOVIE, "Parasite", "Bong Joon-ho"),
    (MediaCategory.MOVIE, "The Lighthouse", "Robert Eggers"),
    (MediaCategory.TV_SHOW, "Succession", "HBO"),
    (MediaCategory.TV_SHOW, "The Bear", "FX"),
    (MediaCategory.PODCAST, "Decoder", "The Verge"),
    (MediaCategory.PODCAST, "Acquired", "Ben Gilbert & David Rosenthal"),
    (MediaCategory.MUSICIAN, "Big Thief", None),
    (MediaCategory.MUSICIAN, "Phoebe Bridgers", None),
    (MediaCategory.BOOK, "Piranesi", "Susanna Clarke"),
    (MediaCategory.BOOK, "The Overstory", "Richard Powers"),
    (MediaCategory.BOOK, "Station Eleven", "Emily St. John Mandel"),
]

STAGES = [None, None, None, "lead", "active", "warm", "cold", "reconnect"]

NOTE_BODIES = [
    "Prefers text over email.",
    "Allergic to shellfish.",
    "Partner's name is on the birthday list.",
    "Loves recommendations for hiking trails.",
    "Wants to be introduced to anyone in biotech.",
    "Spouse just started a new job — send a card.",
    "Kid just started kindergarten.",
    "Tends to go dark between Oct and Feb (seasonal work).",
    "Prefers mornings for calls.",
    "Hates phone calls — text only.",
]

# ─── Helpers ─────────────────────────────────────────────────────────────────


def _rand_date(start_years_ago: int, end_years_ago: int = 0) -> date:
    start = date.today() - timedelta(days=start_years_ago * 365)
    end = date.today() - timedelta(days=end_years_ago * 365)
    delta_days = max((end - start).days, 1)
    return start + timedelta(days=random.randint(0, delta_days))


def _rand_datetime(start_years_ago: int, end_years_ago: int = 0) -> datetime:
    d = _rand_date(start_years_ago, end_years_ago)
    return datetime.combine(
        d,
        datetime.min.time(),
        tzinfo=timezone.utc,
    ) + timedelta(minutes=random.randint(0, 24 * 60 - 1))


def _email_for(first: str, last: str, company: str | None, idx: int) -> str:
    domain_pool = ["gmail.com", "outlook.com", "proton.me", "fastmail.com"]
    if company and random.random() < 0.4:
        slug = company.lower().replace(" ", "").replace(".", "").replace("&", "and")
        domain = f"{slug}.com"
    else:
        domain = random.choice(domain_pool)
    local = f"{first.lower()}.{last.lower()}" if last else first.lower()
    if idx > 0:
        local = f"{local}{idx}"
    return f"{local}@{domain}"


def _phone() -> str:
    return (
        f"+1 ({random.randint(200, 989)}) "
        f"{random.randint(200, 989)}-{random.randint(1000, 9999)}"
    )


def _pick(seq: Sequence, k: int) -> list:
    if not seq or k <= 0:
        return []
    k = min(k, len(seq))
    return random.sample(list(seq), k)


def _all(session: Session, stmt):
    """Helper: run a select and return all rows as a list."""
    return list(session.scalars(stmt).all())


def _first(session: Session, stmt):
    return session.scalars(stmt).first()


# ─── Wipe ────────────────────────────────────────────────────────────────────


def wipe_user_data(session: Session, user_id: uuid.UUID) -> None:
    """Remove all seed data owned by this user. Cascades via FK ondelete=CASCADE."""
    log.info("Wiping existing data for user %s", user_id)
    session.execute(sql_delete(Contact).where(Contact.owner_id == user_id))
    session.execute(sql_delete(Tag).where(Tag.owner_id == user_id))
    session.execute(sql_delete(Group).where(Group.owner_id == user_id))
    session.execute(sql_delete(Reminder).where(Reminder.owner_id == user_id))
    session.commit()


# ─── Seeders ─────────────────────────────────────────────────────────────────


def seed_tags(session: Session, owner_id: uuid.UUID) -> list[Tag]:
    tags = [Tag(name=n, color=c, owner_id=owner_id) for n, c in TAG_SPECS]
    session.add_all(tags)
    session.commit()
    for t in tags:
        session.refresh(t)
    log.info("Seeded %d tags", len(tags))
    return tags


def seed_groups(session: Session, owner_id: uuid.UUID) -> list[Group]:
    groups = [Group(name=n, description=d, owner_id=owner_id) for n, d in GROUP_SPECS]
    session.add_all(groups)
    session.commit()
    for g in groups:
        session.refresh(g)
    log.info("Seeded %d groups", len(groups))
    return groups


def make_contact(owner_id: uuid.UUID) -> Contact:
    first = random.choice(FIRST_NAMES)
    last = random.choice(LAST_NAMES)
    has_company = random.random() < 0.55
    company = random.choice(COMPANIES) if has_company else None
    created_at = _rand_datetime(3, 0)
    updated_at = created_at + timedelta(days=random.randint(0, 365))
    if updated_at > datetime.now(timezone.utc):
        updated_at = datetime.now(timezone.utc)

    birthday = None
    if random.random() < 0.6:
        birthday = _rand_date(start_years_ago=70, end_years_ago=20)

    return Contact(
        owner_id=owner_id,
        first_name=first,
        last_name=last if random.random() < 0.95 else None,
        middle_name=random.choice(FIRST_NAMES) if random.random() < 0.1 else None,
        nickname=first[:3].lower() if random.random() < 0.08 else None,
        company=company,
        department=random.choice(DEPARTMENTS) if has_company else None,
        title=random.choice(TITLES) if has_company else None,
        birthday=birthday,
        how_we_met=random.choice(
            [
                None,
                None,
                None,
                "Met at a conference in 2019.",
                "College roommate freshman year.",
                "Introduced by a mutual friend.",
                "Neighbor when I lived on 14th.",
                "Worked together at a previous company.",
                "Climbing gym regular.",
            ]
        ),
        is_favorite=random.random() < 0.12,
        is_archived=False,
        is_deceased=False,
        contact_frequency_days=random.choice([None, None, None, 30, 60, 90, 180, 365]),
        stage=random.choice(STAGES),
        created_at=created_at,
        updated_at=updated_at,
    )


def seed_contact_children(
    session: Session,
    contact: Contact,
    owner_id: uuid.UUID,
    tags: list[Tag],
    groups: list[Group],
) -> None:
    """Fill the one-to-many children of a single contact."""

    for i in range(random.randint(0, 3)):
        ftype = random.choices(
            [ContactFieldType.EMAIL, ContactFieldType.PHONE], weights=[6, 4]
        )[0]
        value = (
            _email_for(contact.first_name, contact.last_name or "", contact.company, i)
            if ftype == ContactFieldType.EMAIL
            else _phone()
        )
        session.add(
            ContactField(
                contact_id=contact.id,
                field_type=ftype,
                label=random.choice(["home", "work", "cell", "other"]),
                value=value,
                is_primary=(i == 0),
                sort_order=i,
            )
        )

    for _ in range(random.randint(0, 2)):
        city, region = random.choice(CITIES)
        session.add(
            Address(
                contact_id=contact.id,
                label=random.choice(["home", "work", "other"]),
                street=f"{random.randint(100, 9999)} {random.choice(STREETS)}",
                city=city,
                region=region,
                postal_code=f"{random.randint(10000, 99999)}",
                country="USA" if region else random.choice(["UK", "DE", "NL", "JP"]),
            )
        )

    if random.random() < 0.2:
        for _ in range(random.randint(1, 2)):
            species, breeds = random.choice(PET_SPECIES)
            session.add(
                Pet(
                    contact_id=contact.id,
                    name=random.choice(PET_NAMES),
                    species=species,
                    breed=random.choice(breeds),
                )
            )

    for _ in range(random.randint(0, 3)):
        etype, title = random.choice(LIFE_EVENTS)
        session.add(
            LifeEvent(
                contact_id=contact.id,
                owner_id=owner_id,
                event_type=etype,
                title=title,
                occurred_at=_rand_date(8, 0),
                create_annual_reminder=random.random() < 0.15,
            )
        )

    latest_interaction: datetime | None = None
    for _ in range(random.randint(0, 6)):
        occurred = _rand_datetime(2, 0)
        session.add(
            Interaction(
                contact_id=contact.id,
                owner_id=owner_id,
                channel=random.choice(list(InteractionChannel)),
                occurred_at=occurred,
                notes=random.choice(INTERACTION_NOTES) or None,
                mood=random.choice([None, None, "😊", "😐", "🙂", "🤔", "😂"]),
                duration_minutes=random.choice([None, 5, 15, 30, 45, 60, 90]),
            )
        )
        if latest_interaction is None or occurred > latest_interaction:
            latest_interaction = occurred
    contact.last_contacted_at = latest_interaction

    for _ in range(random.randint(0, 2)):
        session.add(
            Note(
                contact_id=contact.id,
                owner_id=owner_id,
                body=random.choice(NOTE_BODIES),
            )
        )

    for _ in range(random.randint(0, 2)):
        remind_at = datetime.now(timezone.utc) + timedelta(
            days=random.randint(-90, 365)
        )
        session.add(
            Reminder(
                contact_id=contact.id,
                owner_id=owner_id,
                title=random.choice(
                    ["Send birthday card", "Check in", "Coffee", "Follow up on intro"]
                ),
                remind_at=remind_at,
                frequency=random.choice(list(ReminderFrequency)),
                is_active=random.random() < 0.8,
            )
        )

    for _ in range(random.randint(0, 2)):
        status = random.choice(list(GiftStatus))
        session.add(
            Gift(
                contact_id=contact.id,
                owner_id=owner_id,
                name=random.choice(GIFT_IDEAS),
                status=status,
                occasion=random.choice(OCCASIONS),
                gift_date=(_rand_date(3, 0) if status != GiftStatus.IDEA else None),
                value_amount=(
                    round(random.uniform(10, 250), 2)
                    if status != GiftStatus.IDEA
                    else None
                ),
            )
        )

    if random.random() < 0.2:
        session.add(
            Debt(
                contact_id=contact.id,
                owner_id=owner_id,
                direction=random.choice(list(DebtDirection)),
                amount=round(random.uniform(5, 500), 2),
                reason=random.choice(
                    [
                        "Split dinner bill",
                        "Concert ticket",
                        "Venmo'd for groceries",
                        "Lent them cash for a cab",
                    ]
                ),
                is_settled=random.random() < 0.55,
            )
        )

    for _ in range(random.randint(0, 2)):
        cat, title, creator = random.choice(MEDIA_ITEMS)
        session.add(
            MediaRecommendation(
                contact_id=contact.id,
                owner_id=owner_id,
                category=cat,
                title=title,
                creator=creator,
                recommended_at=_rand_date(2, 0),
            )
        )

    tag_count = random.choices([0, 1, 2, 3, 4], weights=[2, 4, 4, 2, 1])[0]
    for tag in _pick(tags, tag_count):
        session.add(ContactTag(contact_id=contact.id, tag_id=tag.id))

    group_count = random.choices([0, 1, 2, 3], weights=[2, 5, 3, 1])[0]
    for group in _pick(groups, group_count):
        session.add(ContactGroup(contact_id=contact.id, group_id=group.id))


def seed_relationships(session: Session, contacts: list[Contact]) -> int:
    """Add a graph of relationships — ~25% of contacts get one."""
    added = 0
    pool = [c for c in contacts if not c.is_deceased]
    for c in pool:
        if random.random() >= 0.25:
            continue
        other = random.choice(pool)
        if other.id == c.id:
            continue
        session.add(
            Relationship(
                contact_id=c.id,
                related_contact_id=other.id,
                relationship_type=random.choice(RELATIONSHIP_TYPES),
            )
        )
        added += 1
    return added


def simulate_deletes(session: Session, contacts: list[Contact], fraction: float) -> int:
    """Hard-delete a fraction of contacts (cascades to their children)."""
    n = max(0, int(len(contacts) * fraction))
    victims = random.sample(contacts, n) if n else []
    for c in victims:
        session.delete(c)
    return len(victims)


# ─── Main ────────────────────────────────────────────────────────────────────


def resolve_user(session: Session, email: str) -> User:
    user = _first(session, select(User).where(User.email == email))
    if user is None:
        raise SystemExit(
            f"No user found with email {email!r}. "
            f"Create one first (e.g. the FIRST_SUPERUSER bootstrap), "
            f"then re-run the seeder."
        )
    return user


def run(count: int, email: str, reset: bool, rng_seed: int | None) -> None:
    if rng_seed is not None:
        random.seed(rng_seed)

    with Session(engine) as session:
        user = resolve_user(session, email)
        log.info("Seeding %d contacts for %s (id=%s)", count, user.email, user.id)

        if reset:
            wipe_user_data(session, user.id)

        tags = seed_tags(session, user.id)
        groups = seed_groups(session, user.id)

        contacts: list[Contact] = [make_contact(user.id) for _ in range(count)]
        session.add_all(contacts)
        session.commit()
        for c in contacts:
            session.refresh(c)
        log.info("Inserted %d contact rows", len(contacts))

        for i, c in enumerate(contacts):
            seed_contact_children(session, c, user.id, tags, groups)
            if (i + 1) % 100 == 0:
                session.commit()
                log.info("  … %d contacts worth of children inserted", i + 1)
        session.commit()

        rel_count = seed_relationships(session, contacts)
        session.commit()
        log.info("Seeded %d relationships", rel_count)

        del_count = simulate_deletes(session, contacts, fraction=0.03)
        session.commit()
        log.info("Hard-deleted %d contacts (cascaded to children)", del_count)

        surviving = _all(session, select(Contact).where(Contact.owner_id == user.id))
        log.info("Done. %d contacts now exist for %s.", len(surviving), user.email)


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed fake CRM data.")
    parser.add_argument("--count", type=int, default=500)
    parser.add_argument(
        "--email",
        default=str(settings.FIRST_SUPERUSER),
        help="Owner email (must already exist). Defaults to FIRST_SUPERUSER.",
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Wipe this user's existing contacts/tags/groups/reminders before seeding.",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=None,
        help="RNG seed for determinism (optional).",
    )
    args = parser.parse_args()
    run(count=args.count, email=args.email, reset=args.reset, rng_seed=args.seed)


if __name__ == "__main__":
    main()
