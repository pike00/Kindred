"""Convert saved_filter.filter_json from json to jsonb.

Postgres `json` has no equality operator, which breaks any query that needs
to dedupe rows containing the column — notably `UNION` in the list endpoint
combining owned + tag-shared filters. `jsonb` has `=`, plus better storage
and indexing. No data loss: every existing value is valid jsonb.

Revision ID: j9e0f1g2h3i4
Revises: i8d9e0f1g2h3
Create Date: 2026-05-24 21:30:00.000000

"""
from alembic import op


revision = "j9e0f1g2h3i4"
down_revision = ("i8d9e0f1g2h3", "001_add_saved_filter")
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE saved_filter "
        "ALTER COLUMN filter_json TYPE jsonb USING filter_json::jsonb"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE saved_filter "
        "ALTER COLUMN filter_json TYPE json USING filter_json::json"
    )
