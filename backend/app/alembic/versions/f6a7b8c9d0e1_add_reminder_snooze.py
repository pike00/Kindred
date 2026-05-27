"""Add reminder_snooze table for snooze history tracking.

Revision ID: f6a7b8c9d0e1
Revises: fe56fa70289e
Create Date: 2026-04-21 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "f6a7b8c9d0e1"
down_revision = "001_create_crm_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create reminder_snooze table."""
    op.create_table(
        "reminder_snooze",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("reminder_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "snoozed_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column("snoozed_until", sa.DateTime(timezone=True), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.ForeignKeyConstraint(
            ["reminder_id"], ["reminder.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_reminder_snooze_reminder_id",
        "reminder_snooze",
        ["reminder_id"],
        unique=False,
    )
    op.create_index(
        "ix_reminder_snooze_snoozed_at",
        "reminder_snooze",
        ["snoozed_at"],
        unique=False,
    )


def downgrade() -> None:
    """Drop reminder_snooze table."""
    op.drop_index("ix_reminder_snooze_snoozed_at", "reminder_snooze")
    op.drop_index("ix_reminder_snooze_reminder_id", "reminder_snooze")
    op.drop_table("reminder_snooze")
