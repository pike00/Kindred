"""Add iMessage integration fields to Contact.

Revision ID: add_imessage_fields
Revises: fe56fa70289e
Create Date: 2026-05-03 15:30:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic
revision = "7781b2f3ccfe"
down_revision = "f0af384356f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add iMessage fields to contact table."""
    # Add imessage_id column (E.164 phone or email for stable identity)
    op.add_column(
        "contact",
        sa.Column("imessage_id", sa.String(length=500), nullable=True),
    )
    # Add index on imessage_id for lookups
    op.create_index("ix_contact_imessage_id", "contact", ["imessage_id"], unique=False)

    # Add imessage_synced_at column (last sync timestamp)
    op.add_column(
        "contact",
        sa.Column(
            "imessage_synced_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )

    # Add imessage_profile_hash column (for idempotent updates)
    op.add_column(
        "contact",
        sa.Column("imessage_profile_hash", sa.String(length=64), nullable=True),
    )

    # Add imessage_profile column (raw JSON data)
    op.add_column(
        "contact",
        sa.Column("imessage_profile", sa.JSON(), nullable=True),
    )


def downgrade() -> None:
    """Remove iMessage fields from contact table."""
    op.drop_column("contact", "imessage_profile")
    op.drop_column("contact", "imessage_profile_hash")
    op.drop_index("ix_contact_imessage_id", table_name="contact")
    op.drop_column("contact", "imessage_synced_at")
    op.drop_column("contact", "imessage_id")
