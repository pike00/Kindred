"""Add communication_preference table

Revision ID: d4e5f6a7b8c9
Revises: d3e4f5a6b7c8
Create Date: 2026-04-21 12:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, None] = "d3e4f5a6b7c8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create communication_preference table
    op.create_table(
        "communication_preference",
        sa.Column("id", sa.UUID(), nullable=False, default=sa.text("gen_random_uuid()")),
        sa.Column(
            "contact_id",
            sa.UUID(),
            sa.ForeignKey("contact.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("preferred_channel", sa.String(length=20), nullable=True),
        sa.Column("best_time_local", sa.String(length=11), nullable=True),
        sa.Column("do_not_contact", sa.Boolean(), nullable=False, default=False),
        sa.Column("do_not_contact_reason", sa.String(length=500), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
            onupdate=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_communication_preference_contact_id",
        "communication_preference",
        ["contact_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_table("communication_preference")
