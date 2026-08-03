"""add all contacts share table

Revision ID: q6r7s8t9u0
Revises: p5q6r7s8t9u0
Create Date: 2026-08-03 00:00:00.000000
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "q6r7s8t9u0"
down_revision = "p5q6r7s8t9u0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "all_contacts_share",
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("grantee_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["owner_id"], ["user.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["grantee_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("owner_id", "grantee_id"),
    )


def downgrade() -> None:
    op.drop_table("all_contacts_share")
