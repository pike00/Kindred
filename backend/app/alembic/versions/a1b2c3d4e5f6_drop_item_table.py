"""Drop item table (template leftover)

Revision ID: a1b2c3d4e5f6
Revises: 001_create_crm_schema
Create Date: 2026-04-16 00:00:00.000000
"""
from alembic import op

revision = "a1b2c3d4e5f6"
down_revision = "001_create_crm_schema"
branch_labels = None
depends_on = None


def upgrade():
    op.drop_table("item")


def downgrade():
    raise NotImplementedError("downgrade not supported: item table was template scaffolding")
