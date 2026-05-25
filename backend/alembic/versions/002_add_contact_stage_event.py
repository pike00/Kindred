"""Add contact_stage_event table for stage change audit trail.

Revision ID: 002_add_contact_stage_event
Revises: 001_create_crm_schema
Create Date: 2026-04-23 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic
revision = "002_add_contact_stage_event"
down_revision = "001_create_crm_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create contact_stage_event table."""
    op.create_table(
        "contact_stage_event",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("contact_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("changed_by_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("old_stage", sa.String(length=100), nullable=True),
        sa.Column("new_stage", sa.String(length=100), nullable=True),
        sa.Column("changed_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["contact_id"], ["contact.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["owner_id"], ["user.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["changed_by_id"], ["user.id"], ondelete="SET NULL"),
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
        op.f("ix_contact_stage_event_changed_by_id"),
        "contact_stage_event",
        ["changed_by_id"],
        unique=False,
    )


def downgrade() -> None:
    """Drop contact_stage_event table."""
    op.drop_index(
        op.f("ix_contact_stage_event_changed_by_id"),
        table_name="contact_stage_event",
    )
    op.drop_index(
        op.f("ix_contact_stage_event_owner_id"),
        table_name="contact_stage_event",
    )
    op.drop_index(
        op.f("ix_contact_stage_event_contact_id"),
        table_name="contact_stage_event",
    )
    op.drop_table("contact_stage_event")
