"""Add is_draft and draft_source to Interaction, plus partial index.

Revision ID: f6a7b8c9d0e1
Revises: a7b8c9d0e1f2
Create Date: 2026-04-21 00:00:00.000000

Adds:
- is_draft boolean column (default False)
- draft_source VARCHAR(32) column (nullable)
- Partial index on (contact_id, is_draft) WHERE is_draft=true for draft queries
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic
revision = "add_interaction_drafts"
down_revision = "f7c8d9e0f1a2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add is_draft column with default False
    op.add_column(
        "interaction",
        sa.Column("is_draft", sa.Boolean(), nullable=False, server_default=sa.false()),
    )

    # Add draft_source column (nullable VARCHAR)
    op.add_column(
        "interaction",
        sa.Column("draft_source", sa.String(length=32), nullable=True),
    )

    # Drop the server default now that existing rows are populated
    op.alter_column("interaction", "is_draft", server_default=None)


def downgrade() -> None:
    # Drop draft_source column
    op.drop_column("interaction", "draft_source")

    # Drop is_draft column
    op.drop_column("interaction", "is_draft")
