"""add saved_filter table

Revision ID: 001_add_saved_filter
Revises:
Create Date: 2026-05-03 10:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "001_add_saved_filter"
down_revision: Union[str, None] = "add_debt_payment_table"
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    """Create saved_filter table."""
    op.create_table(
        "saved_filter",
        sa.Column("id", sa.UUID(), nullable=False, primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("filter_json", sa.JSON(), nullable=False),
        sa.Column("tag_id", sa.UUID(), nullable=True),
        sa.Column("owner_id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["owner_id"], ["user.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["tag_id"], ["tag.id"], ondelete="SET NULL"
        ),
    )
    op.create_index("ix_saved_filter_owner_id", "saved_filter", ["owner_id"], unique=False)


def downgrade() -> None:
    """Drop saved_filter table."""
    op.drop_table("saved_filter")
