"""Replace Interaction.contact_id with interaction_attendee junction table.

Revision ID: a7b8c9d0e1f2
Revises: f5a6b7c8d9e0
Create Date: 2026-04-24 00:00:00.000000

Creates the interaction_attendee junction table, backfills it from the existing
Interaction.contact_id column, then drops the column. A downgrade that encounters
any multi-attendee interactions is data-lossy: only the first attendee per
interaction is preserved in the restored contact_id column.
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic
revision = "a7b8c9d0e1f2"
down_revision = "f5a6b7c8d9e0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "interaction_attendee",
        sa.Column("interaction_id", sa.Uuid(), nullable=False),
        sa.Column("contact_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(
            ["interaction_id"], ["interaction.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["contact_id"], ["contact.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("interaction_id", "contact_id"),
    )
    op.create_index(
        "ix_interaction_attendee_contact_id",
        "interaction_attendee",
        ["contact_id"],
    )

    # Backfill from existing one-to-one contact_id.
    op.execute(
        """
        INSERT INTO interaction_attendee (interaction_id, contact_id)
        SELECT id, contact_id FROM interaction
        WHERE contact_id IS NOT NULL
        ON CONFLICT DO NOTHING
        """
    )

    op.drop_constraint("interaction_contact_id_fkey", "interaction", type_="foreignkey")
    op.drop_column("interaction", "contact_id")


def downgrade() -> None:
    op.add_column(
        "interaction",
        sa.Column("contact_id", sa.Uuid(), nullable=True),
    )
    op.create_foreign_key(
        "interaction_contact_id_fkey",
        "interaction",
        "contact",
        ["contact_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # Populate contact_id with one attendee per interaction (first by contact_id).
    op.execute(
        """
        UPDATE interaction i
        SET contact_id = sub.contact_id
        FROM (
            SELECT DISTINCT ON (interaction_id) interaction_id, contact_id
            FROM interaction_attendee
            ORDER BY interaction_id, contact_id
        ) AS sub
        WHERE i.id = sub.interaction_id
        """
    )

    op.alter_column("interaction", "contact_id", nullable=False)

    op.drop_index("ix_interaction_attendee_contact_id", "interaction_attendee")
    op.drop_table("interaction_attendee")
