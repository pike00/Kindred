"""Add debt_payment table and backfill settled debts

Revision ID: f6a7b8c9d0e1
Revises: e2412789c190
Create Date: 2026-04-21 12:00:00.000000

"""
import uuid
from datetime import datetime, timezone

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "add_debt_payment_table"
down_revision = "add_do_not_contact_fields"
branch_labels = None
depends_on = None


def upgrade():
    # ### Create debt_payment table ###
    op.create_table(
        "debt_payment",
        sa.Column("id", sa.UUID(), nullable=False, default=lambda: uuid.uuid4()),
        sa.Column(
            "debt_id",
            sa.UUID(),
            sa.ForeignKey("debt.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("paid_at", sa.Date(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            default=lambda: datetime.now(timezone.utc),
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # ### Backfill existing settled debts with payment rows ###
    # For each settled debt (settled_at IS NOT NULL), create a payment row
    # with amount = debt.amount, paid_at = debt.settled_at
    op.execute(
        """
        INSERT INTO debt_payment (id, debt_id, amount, paid_at, note, created_at)
        SELECT
            gen_random_uuid(),
            id,
            amount::numeric,
            settled_at,
            'Backfilled from settled debt'::text,
            NOW() AT TIME ZONE 'UTC'
        FROM debt
        WHERE settled_at IS NOT NULL
        """
    )


def downgrade():
    # ### Drop debt_payment table ###
    op.drop_table("debt_payment")
