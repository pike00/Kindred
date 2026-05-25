"""Add auto_log_email flag to contact table.

Revision ID: g6b7c8d9e0f1
Revises: fe56fa70289e
Create Date: 2026-05-02 22:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "g6b7c8d9e0f1"
down_revision = "f6a7b8c9d0e2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "contact",
        sa.Column("auto_log_email", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column("contact", "auto_log_email")
