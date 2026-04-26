"""Add deleted_at to contact for soft-delete.

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-04-26 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa

revision = "c3d4e5f6a7b8"
down_revision = "b2c3d4e5f6a7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "contact",
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_contact_deleted_at", "contact", ["deleted_at"]
    )


def downgrade() -> None:
    op.drop_index("ix_contact_deleted_at", "contact")
    op.drop_column("contact", "deleted_at")
