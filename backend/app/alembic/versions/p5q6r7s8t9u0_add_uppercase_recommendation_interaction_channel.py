"""add uppercase recommendation interaction channel

The Python enum is persisted by SQLAlchemy using its member names. The earlier
recommendation migration added the lowercase enum value, but
``InteractionChannel.RECOMMENDATION`` is bound as ``RECOMMENDATION``.

Revision ID: p5q6r7s8t9u0
Revises: o4j5k6l7m8n9
Create Date: 2026-08-01 23:55:00.000000
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "p5q6r7s8t9u0"
down_revision = "o4j5k6l7m8n9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add the SQLAlchemy enum member name used when persisting recommendations."""
    with op.get_context().autocommit_block():
        op.execute(
            "ALTER TYPE interactionchannel ADD VALUE IF NOT EXISTS 'RECOMMENDATION'"
        )


def downgrade() -> None:
    """PostgreSQL cannot safely remove an enum value."""
    pass
