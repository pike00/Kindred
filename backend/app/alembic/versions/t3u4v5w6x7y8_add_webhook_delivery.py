"""Add idempotency records for webhook deliveries.

Revision ID: t3u4v5w6x7y8
Revises: s2t3u4v5w6x7
Create Date: 2026-11-02
"""

import sqlalchemy as sa

from alembic import op

revision = "t3u4v5w6x7y8"
down_revision = "s2t3u4v5w6x7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "webhook_delivery",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("webhook_id", sa.UUID(), nullable=False),
        sa.Column("delivery_id", sa.String(length=255), nullable=False),
        sa.Column("interaction_id", sa.UUID(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["interaction_id"],
            ["interaction.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["webhook_id"],
            ["webhook_endpoint.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "webhook_id",
            "delivery_id",
            name="uq_webhook_delivery_event",
        ),
    )
    op.create_index(
        "ix_webhook_delivery_webhook_id",
        "webhook_delivery",
        ["webhook_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_webhook_delivery_webhook_id",
        table_name="webhook_delivery",
    )
    op.drop_table("webhook_delivery")
