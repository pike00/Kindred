"""Add bounded reminder delivery retry state.

Revision ID: v5w6x7y8z9a
Revises: u4v5w6x7y8z9
Create Date: 2026-11-02
"""

import sqlalchemy as sa

from alembic import op

revision = "v5w6x7y8z9a"
down_revision = "u4v5w6x7y8z9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "reminder",
        sa.Column(
            "delivery_attempts",
            sa.Integer(),
            server_default=sa.text("0"),
            nullable=False,
        ),
    )
    op.add_column(
        "reminder",
        sa.Column("next_delivery_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("reminder", "next_delivery_at")
    op.drop_column("reminder", "delivery_attempts")
