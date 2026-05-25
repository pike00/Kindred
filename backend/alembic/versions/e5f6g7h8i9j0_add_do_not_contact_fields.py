"""Add do_not_contact fields to Contact

Revision ID: e5f6g7h8i9j0
Revises: e2412789c190
Create Date: 2026-05-03

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "e5f6g7h8i9j0"
down_revision = "e2412789c190"  # Update this to the actual last migration
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add do_not_contact column
    op.add_column(
        "contact",
        sa.Column("do_not_contact", sa.Boolean(), server_default="false", nullable=False)
    )

    # Add do_not_contact_reason column
    op.add_column(
        "contact",
        sa.Column("do_not_contact_reason", sa.String(length=500), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("contact", "do_not_contact_reason")
    op.drop_column("contact", "do_not_contact")
