"""add recommendation interaction channel

Recommendations (books/shows/etc. to or from a contact) are folded into
interactions rather than a separate media entity (tofix #10). Add the
'recommendation' value to the interactionchannel enum.

Revision ID: a9b8c7d6e5f4
Revises: c6ea450d8cf8
Create Date: 2026-05-31 21:30:00.000000
"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "a9b8c7d6e5f4"
down_revision = "c6ea450d8cf8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ALTER TYPE ... ADD VALUE must run outside a transaction block.
    with op.get_context().autocommit_block():
        op.execute(
            "ALTER TYPE interactionchannel ADD VALUE IF NOT EXISTS 'recommendation'"
        )


def downgrade() -> None:
    # PostgreSQL cannot remove a value from an enum type; leave it in place
    # (an unused enum value is harmless).
    pass
