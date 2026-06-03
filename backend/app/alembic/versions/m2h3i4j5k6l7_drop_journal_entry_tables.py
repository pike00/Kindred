"""Drop journal_entry and journal_entry_contact tables (Journal feature removed).

Revision ID: m2h3i4j5k6l7
Revises: a9b8c7d6e5f4
Create Date: 2026-06-01 00:00:00.000000

The Journal feature was removed end-to-end (routes, models, UI). These tables
were empty in all environments, so the drop is non-destructive. Junction table
is dropped first because it carries a FK to journal_entry.
"""

import sqlalchemy as sa
import sqlalchemy.dialects.postgresql as postgresql
from alembic import op

# revision identifiers, used by Alembic
revision = "m2h3i4j5k6l7"
down_revision = "a9b8c7d6e5f4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Junction first (FK -> journal_entry). Indexes drop with the table.
    op.drop_table("journal_entry_contact")
    # Trigger + function attached to journal_entry.
    op.execute("DROP TRIGGER IF EXISTS tsvectorupdate_journal_entry ON journal_entry;")
    op.execute("DROP FUNCTION IF EXISTS update_journal_entry_search_vector();")
    op.drop_table("journal_entry")


def downgrade() -> None:
    op.create_table(
        "journal_entry",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("body", sa.String(length=50000), nullable=False),
        sa.Column("mood", sa.String(length=50), nullable=True),
        sa.Column("entry_date", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("search_vector", postgresql.TSVECTOR, nullable=True),
        sa.ForeignKeyConstraint(["owner_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_journal_entry_owner_id"), "journal_entry", ["owner_id"], unique=False
    )
    op.create_index(
        op.f("ix_journal_entry_entry_date"),
        "journal_entry",
        ["entry_date"],
        unique=False,
    )
    op.create_index(
        "ix_journal_entry_search_vector",
        "journal_entry",
        ["search_vector"],
        postgresql_using="gin",
    )
    op.execute("""
        CREATE OR REPLACE FUNCTION update_journal_entry_search_vector() RETURNS trigger AS $$
        BEGIN
            NEW.search_vector := to_tsvector('english', COALESCE(NEW.body, ''));
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)
    op.execute("""
        CREATE TRIGGER tsvectorupdate_journal_entry
        BEFORE INSERT OR UPDATE ON journal_entry
        FOR EACH ROW EXECUTE FUNCTION update_journal_entry_search_vector();
    """)
    op.create_table(
        "journal_entry_contact",
        sa.Column("journal_entry_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("contact_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["journal_entry_id"], ["journal_entry.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["contact_id"], ["contact.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("journal_entry_id", "contact_id"),
    )
    op.create_index(
        "ix_journal_entry_contact_contact_id",
        "journal_entry_contact",
        ["contact_id"],
    )
    op.create_index(
        "ix_journal_entry_contact_journal_entry_id",
        "journal_entry_contact",
        ["journal_entry_id"],
    )
