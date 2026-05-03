"""Add inverse_id to relationship for symmetric pair tracking.

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-05-01 20:00:00.000000

Each directional relationship row is now paired with an inverse row
pointing the opposite direction. ``inverse_id`` cross-links the two
so deletes can cascade to keep both contacts' profiles symmetric.

Existing rows have ``inverse_id`` left NULL; they continue to work
as one-way links until the user re-saves them.
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic
revision = "e5f6a7b8c9d0"
down_revision = "d4e5f6a7b8c9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "relationship",
        sa.Column("inverse_id", sa.Uuid(), nullable=True),
    )
    op.create_foreign_key(
        "fk_relationship_inverse_id",
        "relationship",
        "relationship",
        ["inverse_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_relationship_inverse_id",
        "relationship",
        ["inverse_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_relationship_inverse_id", "relationship")
    op.drop_constraint(
        "fk_relationship_inverse_id", "relationship", type_="foreignkey"
    )
    op.drop_column("relationship", "inverse_id")
