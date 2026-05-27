"""merge_all_heads_2026_05_26

Revision ID: c6ea450d8cf8
Revises: 3fa74dc5ffaa, 516cd84f60a9, a0b1c2d3e4f5, add_ical_import_log, ics0001_interaction_channel_skip, add_communication_preference, add_debt_payment_table, add_journal_contact_junction, add_timezone_pronouns, f6a7b8c9d0e2, f7c8d9e0f1a2, add_interaction_location, l1g2h3i4j5k6
Create Date: 2026-05-27 01:40:14.317496

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = 'c6ea450d8cf8'
down_revision = ('3fa74dc5ffaa', '516cd84f60a9', 'a0b1c2d3e4f5', 'add_ical_import_log', 'ics0001_interaction_channel_skip', 'add_communication_preference', 'add_debt_payment_table', 'add_journal_contact_junction', 'add_timezone_pronouns', 'f6a7b8c9d0e2', 'f7c8d9e0f1a2', 'add_interaction_location', 'l1g2h3i4j5k6')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
