"""add_deleted_at_soft_delete

Revision ID: f0af384356f6
Revises: f7a8b9c0d1e2
Create Date: 2026-05-16 00:23:58.811662

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'f0af384356f6'
down_revision = 'f7a8b9c0d1e2'
branch_labels = None
depends_on = None


def upgrade():
    tables = ["interaction", "reminder", "gift", "debt", "life_event", "note"]
    for table in tables:
        op.add_column(table, sa.Column("deleted_at", sa.DateTime(), nullable=True))
        op.create_index(f"ix_{table}_deleted_at", table, ["deleted_at"])


def downgrade():
    tables = ["interaction", "reminder", "gift", "debt", "life_event", "note"]
    for table in reversed(tables):
        op.drop_index(f"ix_{table}_deleted_at", table_name=table)
        op.drop_column(table, "deleted_at")
