"""merge heads for twilio webhook and do_not_contact

Revision ID: 516cd84f60a9
Revises: add_contact_field_value_index, add_do_not_contact_fields
Create Date: 2026-05-03 21:11:42.231533

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '516cd84f60a9'
down_revision = ('add_contact_field_value_index', 'add_do_not_contact_fields')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
