"""Add deleted_at to Interaction, Reminder, Gift, Debt, LifeEvent, Note.

Revision ID: f6a7b8c9d0e1
Revises: c3d4e5f6a7b8
Create Date: 2026-05-03 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import DateTime

revision = "f6a7b8c9d0e1"
down_revision = "d7d81f2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add deleted_at to interaction
    op.add_column(
        "interaction",
        sa.Column("deleted_at", DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_interaction_deleted_at", "interaction", ["deleted_at"]
    )

    # Add deleted_at to reminder
    op.add_column(
        "reminder",
        sa.Column("deleted_at", DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_reminder_deleted_at", "reminder", ["deleted_at"]
    )

    # Add deleted_at to gift
    op.add_column(
        "gift",
        sa.Column("deleted_at", DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_gift_deleted_at", "gift", ["deleted_at"]
    )

    # Add deleted_at to debt
    op.add_column(
        "debt",
        sa.Column("deleted_at", DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_debt_deleted_at", "debt", ["deleted_at"]
    )

    # Add deleted_at to life_event
    op.add_column(
        "life_event",
        sa.Column("deleted_at", DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_life_event_deleted_at", "life_event", ["deleted_at"]
    )

    # Add deleted_at to note
    op.add_column(
        "note",
        sa.Column("deleted_at", DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_note_deleted_at", "note", ["deleted_at"]
    )


def downgrade() -> None:
    # Remove deleted_at from note
    op.drop_index("ix_note_deleted_at", "note")
    op.drop_column("note", "deleted_at")

    # Remove deleted_at from life_event
    op.drop_index("ix_life_event_deleted_at", "life_event")
    op.drop_column("life_event", "deleted_at")

    # Remove deleted_at from debt
    op.drop_index("ix_debt_deleted_at", "debt")
    op.drop_column("debt", "deleted_at")

    # Remove deleted_at from gift
    op.drop_index("ix_gift_deleted_at", "gift")
    op.drop_column("gift", "deleted_at")

    # Remove deleted_at from reminder
    op.drop_index("ix_reminder_deleted_at", "reminder")
    op.drop_column("reminder", "deleted_at")

    # Remove deleted_at from interaction
    op.drop_index("ix_interaction_deleted_at", "interaction")
    op.drop_column("interaction", "deleted_at")
