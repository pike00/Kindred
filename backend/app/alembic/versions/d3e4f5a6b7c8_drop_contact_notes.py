"""Drop notes column from contact table.

Revision ID: d3e4f5a6b7c8
Revises: c2d3e4f5a6b7
Create Date: 2026-04-19 22:00:00.000000

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic
revision = "d3e4f5a6b7c8"
down_revision = "c2d3e4f5a6b7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("contact", "notes")


def downgrade() -> None:
    op.add_column(
        "contact",
        sa.Column("notes", sa.String(length=10000), nullable=True),
    )
