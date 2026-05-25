"""Add email fields to interaction table.

Revision ID: i8d9e0f1g2h3
Revises: h7c8d9e0f1g2
Create Date: 2026-05-24 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "i8d9e0f1g2h3"
down_revision = "h7c8d9e0f1g2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "interaction",
        sa.Column("message_id", sa.String(length=998), nullable=True),
    )
    op.add_column(
        "interaction",
        sa.Column("email_subject", sa.String(length=998), nullable=True),
    )
    op.add_column(
        "interaction",
        sa.Column("email_from", sa.String(length=2048), nullable=True),
    )
    op.add_column(
        "interaction",
        sa.Column("email_to", sa.String(length=2048), nullable=True),
    )
    op.add_column(
        "interaction",
        sa.Column("email_date", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("interaction", "email_date")
    op.drop_column("interaction", "email_to")
    op.drop_column("interaction", "email_from")
    op.drop_column("interaction", "email_subject")
    op.drop_column("interaction", "message_id")
