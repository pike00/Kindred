"""Add client_id to Note model for idempotent POSTs

Revision ID: f6a7b8c9d0e2
Revises: bbe18621bcef
Create Date: 2026-04-23
"""

import sqlalchemy as sa
from alembic import op

# Revision identifiers
revision = "f6a7b8c9d0e2"
down_revision = "add_timezone_pronouns"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("note", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("client_id", sa.String(length=36), nullable=True)
        )
        batch_op.create_index("ix_note_client_id", ["client_id"], unique=False)
        # We'll add the unique constraint separately to handle existing NULLs
        # SQLite doesn't support adding unique constraints with NULLs easily
        # The unique=True in the model will be enforced at the application level
        # and for new non-NULL values


def downgrade() -> None:
    with op.batch_alter_table("note", schema=None) as batch_op:
        batch_op.drop_index("ix_note_client_id")
        batch_op.drop_column("client_id")
