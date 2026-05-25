"""merge_email_ingestion_heads

Revision ID: 3fa74dc5ffaa
Revises: h7c8d9e0f1g2, f7a8b9c0d1e2
Create Date: 2026-05-08 19:42:51.592967

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '3fa74dc5ffaa'
down_revision = ('h7c8d9e0f1g2', 'f7a8b9c0d1e2')
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("interaction", sa.Column("message_id", sa.String(), nullable=True))
    op.add_column("interaction", sa.Column("email_subject", sa.String(), nullable=True))
    op.add_column("interaction", sa.Column("email_from", sa.String(), nullable=True))
    op.add_column("interaction", sa.Column("email_to", sa.String(), nullable=True))
    op.add_column("interaction", sa.Column("email_date", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_interaction_message_id", "interaction", ["message_id"], unique=False)


def downgrade():
    op.drop_index("ix_interaction_message_id", "interaction")
    op.drop_column("interaction", "email_date")
    op.drop_column("interaction", "email_to")
    op.drop_column("interaction", "email_from")
    op.drop_column("interaction", "email_subject")
    op.drop_column("interaction", "message_id")
