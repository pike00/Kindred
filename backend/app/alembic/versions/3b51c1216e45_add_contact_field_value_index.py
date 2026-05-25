"""Add index on contact_field.value for E.164 phone number lookups.

Revision ID: add_contact_field_value_index
Revises: 6639555a4ae8
Create Date: 2026-01-04 12:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic
revision = "3b51c1216e45"
down_revision = "7781b2f3ccfe"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add index on contact_field.value for efficient E.164 phone lookups."""
    # Add a B-tree index on value column for fast lookups
    # This is used by the Twilio webhook to match E.164 normalized numbers
    op.create_index(
        op.f("ix_contact_field_value"),
        "contact_field",
        ["value"],
        unique=False,
    )


def downgrade() -> None:
    """Remove the index on contact_field.value."""
    op.drop_index(op.f("ix_contact_field_value"), table_name="contact_field")
