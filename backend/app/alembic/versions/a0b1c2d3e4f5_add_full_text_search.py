"""Add tsvector columns and GIN indexes for full-text search.

Revision ID: a0b1c2d3e4f5
Revises: f5a6b7c8d9e0
Create Date: 2026-05-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = "a0b1c2d3e4f5"
down_revision = "e6f7a8b9c0d1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add search_vector columns, triggers, and GIN indexes."""

    # ── 1. Contact table ────────────────────────────────────────────────
    op.add_column(
        "contact",
        sa.Column("search_vector", postgresql.TSVECTOR, nullable=True),
    )
    op.create_index(
        "ix_contact_search_vector",
        "contact",
        ["search_vector"],
        postgresql_using="gin",
    )
    op.execute("""
        CREATE OR REPLACE FUNCTION update_contact_search_vector() RETURNS trigger AS $$
        BEGIN
            NEW.search_vector := to_tsvector('english',
                COALESCE(NEW.first_name, '') || ' ' ||
                COALESCE(NEW.last_name, '') || ' ' ||
                COALESCE(NEW.company, '') || ' ' ||
                COALESCE(NEW.how_we_met, '')
            );
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)
    op.execute("""
        CREATE TRIGGER tsvectorupdate_contact
        BEFORE INSERT OR UPDATE ON contact
        FOR EACH ROW EXECUTE FUNCTION update_contact_search_vector();
    """)
    op.execute("""
        UPDATE contact SET search_vector = to_tsvector('english',
            COALESCE(first_name, '') || ' ' ||
            COALESCE(last_name, '') || ' ' ||
            COALESCE(company, '') || ' ' ||
            COALESCE(how_we_met, '')
        );
    """)

    # ── 2. Note table ───────────────────────────────────────────────────
    op.add_column(
        "note",
        sa.Column("search_vector", postgresql.TSVECTOR, nullable=True),
    )
    op.create_index(
        "ix_note_search_vector",
        "note",
        ["search_vector"],
        postgresql_using="gin",
    )
    op.execute("""
        CREATE OR REPLACE FUNCTION update_note_search_vector() RETURNS trigger AS $$
        BEGIN
            NEW.search_vector := to_tsvector('english', COALESCE(NEW.body, ''));
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)
    op.execute("""
        CREATE TRIGGER tsvectorupdate_note
        BEFORE INSERT OR UPDATE ON note
        FOR EACH ROW EXECUTE FUNCTION update_note_search_vector();
    """)
    op.execute("""
        UPDATE note SET search_vector = to_tsvector('english', COALESCE(body, ''));
    """)

    # ── 3. Interaction table ────────────────────────────────────────────
    op.add_column(
        "interaction",
        sa.Column("search_vector", postgresql.TSVECTOR, nullable=True),
    )
    op.create_index(
        "ix_interaction_search_vector",
        "interaction",
        ["search_vector"],
        postgresql_using="gin",
    )
    op.execute("""
        CREATE OR REPLACE FUNCTION update_interaction_search_vector() RETURNS trigger AS $$
        BEGIN
            NEW.search_vector := to_tsvector('english', COALESCE(NEW.notes, ''));
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)
    op.execute("""
        CREATE TRIGGER tsvectorupdate_interaction
        BEFORE INSERT OR UPDATE ON interaction
        FOR EACH ROW EXECUTE FUNCTION update_interaction_search_vector();
    """)
    op.execute("""
        UPDATE interaction SET search_vector = to_tsvector('english', COALESCE(notes, ''));
    """)

    # ── 4. JournalEntry table ───────────────────────────────────────────
    op.add_column(
        "journal_entry",
        sa.Column("search_vector", postgresql.TSVECTOR, nullable=True),
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
    op.execute("""
        UPDATE journal_entry SET search_vector = to_tsvector('english', COALESCE(body, ''));
    """)


def downgrade() -> None:
    """Remove GIN indexes, triggers, functions, and search_vector columns."""

    # ── 4. JournalEntry table ───────────────────────────────────────────
    op.execute("DROP TRIGGER IF EXISTS tsvectorupdate_journal_entry ON journal_entry;")
    op.execute("DROP FUNCTION IF EXISTS update_journal_entry_search_vector();")
    op.drop_index("ix_journal_entry_search_vector", table_name="journal_entry")
    op.drop_column("journal_entry", "search_vector")

    # ── 3. Interaction table ────────────────────────────────────────────
    op.execute("DROP TRIGGER IF EXISTS tsvectorupdate_interaction ON interaction;")
    op.execute("DROP FUNCTION IF EXISTS update_interaction_search_vector();")
    op.drop_index("ix_interaction_search_vector", table_name="interaction")
    op.drop_column("interaction", "search_vector")

    # ── 2. Note table ───────────────────────────────────────────────────
    op.execute("DROP TRIGGER IF EXISTS tsvectorupdate_note ON note;")
    op.execute("DROP FUNCTION IF EXISTS update_note_search_vector();")
    op.drop_index("ix_note_search_vector", table_name="note")
    op.drop_column("note", "search_vector")

    # ── 1. Contact table ────────────────────────────────────────────────
    op.execute("DROP TRIGGER IF EXISTS tsvectorupdate_contact ON contact;")
    op.execute("DROP FUNCTION IF EXISTS update_contact_search_vector();")
    op.drop_index("ix_contact_search_vector", table_name="contact")
    op.drop_column("contact", "search_vector")
