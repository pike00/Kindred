"""merge heads for reminder_snooze

Revision ID: 05520c44bc90
Revises: bbe18621bcef, f6a7b8c9d0e1
Create Date: 2026-05-03 09:36:46.895350

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '05520c44bc90'
down_revision = ('bbe18621bcef', 'f6a7b8c9d0e1')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
