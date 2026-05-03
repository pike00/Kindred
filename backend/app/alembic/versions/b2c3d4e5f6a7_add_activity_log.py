"""Add activity_log table for audit trail.

Revision ID: b2c3d4e5f6a7
Revises: a7b8c9d0e1f2
Create Date: 2026-04-26 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa

revision = "b2c3d4e5f6a7"
down_revision = "a7b8c9d0e1f2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "activity_log",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("owner_id", sa.Uuid(), nullable=False),
        sa.Column("actor_id", sa.Uuid(), nullable=True),
        sa.Column("entity_type", sa.String(length=64), nullable=False),
        sa.Column("entity_id", sa.Uuid(), nullable=False),
        sa.Column("action", sa.String(length=32), nullable=False),
        sa.Column("changes_json", sa.JSON(), nullable=True),
        sa.Column(
            "occurred_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["actor_id"], ["user.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["owner_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_activity_log_owner_id", "activity_log", ["owner_id"])
    op.create_index("ix_activity_log_actor_id", "activity_log", ["actor_id"])
    op.create_index("ix_activity_log_entity_id", "activity_log", ["entity_id"])


def downgrade() -> None:
    op.drop_index("ix_activity_log_entity_id", "activity_log")
    op.drop_index("ix_activity_log_actor_id", "activity_log")
    op.drop_index("ix_activity_log_owner_id", "activity_log")
    op.drop_table("activity_log")
