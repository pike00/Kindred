"""Add do_not_contact fields to Contact

Revision ID: add_do_not_contact_fields
Revises: 05520c44bc90
Create Date: 2026-05-03 12:00:00.000000

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic
revision = "add_do_not_contact_fields"
down_revision = "05520c44bc90"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "contact",
        sa.Column("do_not_contact", sa.Boolean(), server_default="false", nullable=False),
    )
    op.add_column(
        "contact",
        sa.Column("do_not_contact_reason", sa.String(length=500), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("contact", "do_not_contact_reason")
    op.drop_column("contact", "do_not_contact")
