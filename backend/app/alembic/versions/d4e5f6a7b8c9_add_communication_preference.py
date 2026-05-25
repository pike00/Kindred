"""Add communication preference table.

Revision ID: d4e5f6a7b8c9
Revises: c2d3e4f5a6b7
Create Date: 2026-04-21 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic
revision = "add_communication_preference"
down_revision = "add_do_not_contact_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create communication_preference table."""
    op.create_table(
        "communication_preference",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("contact_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("preferred_channel", sa.String(length=20), nullable=True),
        sa.Column("best_time_local", sa.String(length=11), nullable=True),
        sa.Column("do_not_contact", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("do_not_contact_reason", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["contact_id"], ["contact.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("contact_id", name="uq_communication_preference_contact_id"),
    )
    op.create_index(
        op.f("ix_communication_preference_contact_id"),
        "communication_preference",
        ["contact_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_communication_preference_preferred_channel"),
        "communication_preference",
        ["preferred_channel"],
        unique=False,
    )


def downgrade() -> None:
    """Drop communication_preference table."""
    op.drop_index(
        op.f("ix_communication_preference_preferred_channel"),
        table_name="communication_preference",
    )
    op.drop_index(
        op.f("ix_communication_preference_contact_id"),
        table_name="communication_preference",
    )
    op.drop_table("communication_preference")
