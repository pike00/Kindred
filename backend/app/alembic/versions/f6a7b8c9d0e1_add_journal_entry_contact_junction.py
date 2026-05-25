"""Add journal_entry_contact junction table for linking journal entries to contacts.

Revision ID: f6a7b8c9d0e1
Revises: 001_create_crm_schema.py
Create Date: 2026-04-21 00:00:00.000000

Creates the journal_entry_contact junction table so journal entries can
reference contacts privately. Cascades on delete: removing a contact removes
the junction row but leaves the journal entry intact; deleting a journal
entry cascades to remove its junction rows.
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic
revision = "add_journal_contact_junction"
down_revision = "add_do_not_contact_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "journal_entry_contact",
        sa.Column("journal_entry_id", sa.Uuid(), nullable=False),
        sa.Column("contact_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(
            ["journal_entry_id"], ["journal_entry.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["contact_id"], ["contact.id"], ondelete="CASCADE"
        ),
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


def downgrade() -> None:
    op.drop_index("ix_journal_entry_contact_journal_entry_id", "journal_entry_contact")
    op.drop_index("ix_journal_entry_contact_contact_id", "journal_entry_contact")
    op.drop_table("journal_entry_contact")
