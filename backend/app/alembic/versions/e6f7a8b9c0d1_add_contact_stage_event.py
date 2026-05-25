"""Add contact_stage_event table for stage history tracking.

Revision ID: e6f7a8b9c0d1
Revises: c2d3e4f5a6b7  # latest migration before this one
Create Date: 2026-04-21 12:00:00.000000

"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic
revision = "e6f7a8b9c0d1"
down_revision = "add_calendar_token"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create contact_stage_event table."""
    op.create_table(
        "contact_stage_event",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("contact_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("from_stage", sa.String(length=100), nullable=True),
        sa.Column("to_stage", sa.String(length=100), nullable=True),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("note", sa.String(length=2000), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["contact_id"], ["contact.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["owner_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_contact_stage_event_contact_id"),
        "contact_stage_event",
        ["contact_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_contact_stage_event_owner_id"),
        "contact_stage_event",
        ["owner_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_contact_stage_event_occurred_at"),
        "contact_stage_event",
        ["occurred_at"],
        unique=False,
    )


def downgrade() -> None:
    """Drop contact_stage_event table."""
    op.drop_index(
        op.f("ix_contact_stage_event_occurred_at"), table_name="contact_stage_event"
    )
    op.drop_index(
        op.f("ix_contact_stage_event_owner_id"), table_name="contact_stage_event"
    )
    op.drop_index(
        op.f("ix_contact_stage_event_contact_id"), table_name="contact_stage_event"
    )
    op.drop_table("contact_stage_event")
