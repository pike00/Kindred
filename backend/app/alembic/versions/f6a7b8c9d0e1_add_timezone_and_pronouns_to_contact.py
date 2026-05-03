"""Add timezone and pronouns to contact

Revision ID: f6a7b8c9d0e1
Revises: fe56fa70289e
Create Date: 2026-04-21 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "f6a7b8c9d0e1"
down_revision = "e5f6a7b8c9d0"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("contact", sa.Column("timezone", sa.VARCHAR(length=255), nullable=True))
    op.add_column("contact", sa.Column("pronouns", sa.TEXT(), nullable=True))


def downgrade():
    op.drop_column("contact", "pronouns")
    op.drop_column("contact", "timezone")
