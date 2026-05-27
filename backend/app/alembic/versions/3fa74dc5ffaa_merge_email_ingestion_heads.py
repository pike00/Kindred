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
down_revision = ('i8d9e0f1g2h3', 'f7a8b9c0d1e2')
branch_labels = None
depends_on = None


def upgrade():
    # Columns already added by i8d9e0f1g2h3; just add the index here.
    op.create_index("ix_interaction_message_id", "interaction", ["message_id"], unique=False)


def downgrade():
    op.drop_index("ix_interaction_message_id", "interaction")
