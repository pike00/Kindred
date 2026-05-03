"""merge_heads

Revision ID: bbe18621bcef
Revises: 6639555a4ae8, d5e6f7a8b9c0
Create Date: 2026-05-03 06:37:22.774822

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = 'bbe18621bcef'
down_revision = ('6639555a4ae8', 'd5e6f7a8b9c0')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
