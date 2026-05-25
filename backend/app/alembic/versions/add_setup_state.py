"""Add setup_state singleton table for token-gated first-boot admin onboarding.

Revision ID: add_setup_state
Revises: add_do_not_contact_fields
Create Date: 2026-05-03 14:00:00.000000

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic
revision = "add_setup_state"
down_revision = "add_do_not_contact_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "setup_state",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("complete", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("token_hash", sa.String(length=128), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("setup_state")
