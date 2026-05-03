"""Add PURCHASED and WRAPPED to GiftStatus enum

Revision ID: 6639555a4ae8
Revises: d98dd8ec85a3
Create Date: 2026-04-23 12:00:00.000000

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = "6639555a4ae8"
down_revision = "add_api_key_auth"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add PURCHASED and WRAPPED values to the giftstatus enum."""
    # Add new enum values - order doesn't matter in PostgreSQL enums
    # but we add them in logical pipeline order: IDEA -> PURCHASED -> WRAPPED -> GIVEN -> RECEIVED
    op.execute("ALTER TYPE giftstatus ADD VALUE 'PURCHASED'")
    op.execute("ALTER TYPE giftstatus ADD VALUE 'WRAPPED'")


def downgrade() -> None:
    """Remove PURCHASED and WRAPPED values from the giftstatus enum.

    Note: PostgreSQL doesn't support removing enum values directly.
    The downgrade is a no-op - old values remain in the database but
    won't be used by the application after downgrade.
    """
    # Cannot easily remove enum values in PostgreSQL
    # In production, you would need to recreate the type
    # For now, this is a no-op
    pass
