"""Add location fields to Interaction table.

Revision ID: e6f7a8b9c0d1
Revises: e2412789c190
Create Date: 2026-04-21 12:00:00.000000

Adds location_label, latitude, and longitude columns to the Interaction table
to support "where we had coffee" tracking with optional geocoded coordinates.
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic
revision = "e6f7a8b9c0d1"
down_revision = "e2412789c190"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add location columns to interaction table."""
    op.add_column(
        "interaction",
        sa.Column("location_label", sa.String(length=500), nullable=True),
    )
    op.add_column(
        "interaction",
        sa.Column("latitude", sa.Float(), nullable=True),
    )
    op.add_column(
        "interaction",
        sa.Column("longitude", sa.Float(), nullable=True),
    )


def downgrade() -> None:
    """Remove location columns from interaction table."""
    op.drop_column("interaction", "longitude")
    op.drop_column("interaction", "latitude")
    op.drop_column("interaction", "location_label")
