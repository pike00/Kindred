"""Drop interaction.mood column (mood field removed from the product).

Revision ID: n3i4j5k6l7m8
Revises: m2h3i4j5k6l7
Create Date: 2026-06-03 00:00:00.000000

The mood field was removed from interactions everywhere (models, schemas,
forms, displays). The interaction full-text search trigger only indexes
`notes`, so dropping this column does not affect search.
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic
revision = "n3i4j5k6l7m8"
down_revision = "m2h3i4j5k6l7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("interaction", "mood")


def downgrade() -> None:
    op.add_column(
        "interaction",
        sa.Column("mood", sa.String(length=50), nullable=True),
    )
