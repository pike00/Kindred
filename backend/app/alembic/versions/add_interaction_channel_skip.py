"""add SKIP to interactionchannel enum

Revision ID: ics0001_interaction_channel_skip
Revises: c4e5f6a7b8c9
Create Date: 2026-05-06 21:00:00.000000

"""

from alembic import op

revision = "ics0001_interaction_channel_skip"
down_revision = "c4e5f6a7b8c9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE interactionchannel ADD VALUE IF NOT EXISTS 'SKIP'")


def downgrade() -> None:
    # Postgres does not support removing a single enum value safely.
    pass
