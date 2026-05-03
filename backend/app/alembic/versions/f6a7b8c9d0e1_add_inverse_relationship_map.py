"""Add inverse_relationship_map table for configurable relationship inverses.

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-05-03 12:00:00.000000

This table replaces the Python-only mapping in ``relationship_inverses.py``
so the database becomes the single source of truth for inverse lookups.
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic
revision = "f6a7b8c9d0e1"
down_revision = "e5f6a7b8c9d0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "inverse_relationship_map",
        sa.Column("id", sa.Uuid(), nullable=False, primary_key=True),
        sa.Column("relationship_type", sa.String(length=100), nullable=False),
        sa.Column("inverse_type", sa.String(length=100), nullable=False),
        sa.Column("is_symmetric", sa.Boolean(), nullable=False, default=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("relationship_type", name="uq_inverse_map_relationship_type"),
    )
    op.create_index(
        "ix_inverse_relationship_map_relationship_type",
        "inverse_relationship_map",
        ["relationship_type"],
    )


def downgrade() -> None:
    op.drop_index("ix_inverse_relationship_map_relationship_type", "inverse_relationship_map")
    op.drop_table("inverse_relationship_map")
