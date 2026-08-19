"""add snoozed_until to contact

Revision ID: add_contact_snoozed_until
Revises: c6ea450d8cf8
Create Date: 2026-08-18 20:50:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_contact_snoozed_until'
down_revision = 'c6ea450d8cf8'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'contact',
        sa.Column('snoozed_until', sa.DateTime(timezone=True), nullable=True)
    )


def downgrade():
    op.drop_column('contact', 'snoozed_until')
