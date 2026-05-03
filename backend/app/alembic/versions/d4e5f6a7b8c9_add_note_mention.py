"""Add note_mention junction table for @-mention backlinks.

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-04-26 22:00:00.000000

Creates the note_mention junction so notes can reference contacts via
``@[Name](uuid)`` tokens in the body. The contact's timeline UNIONs against
this table to surface backlinks. No offset/length stored — the body itself
remains canonical.
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic
revision = "d4e5f6a7b8c9"
down_revision = "c3d4e5f6a7b8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "note_mention",
        sa.Column("note_id", sa.Uuid(), nullable=False),
        sa.Column("contact_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(
            ["note_id"], ["note.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["contact_id"], ["contact.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("note_id", "contact_id"),
    )
    op.create_index(
        "ix_note_mention_contact_id",
        "note_mention",
        ["contact_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_note_mention_contact_id", "note_mention")
    op.drop_table("note_mention")
