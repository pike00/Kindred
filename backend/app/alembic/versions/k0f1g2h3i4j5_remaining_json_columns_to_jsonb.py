"""Convert contact.imessage_profile and activity_log.changes_json to jsonb.

Same rationale as j9e0f1g2h3i4: postgres `json` lacks an equality operator,
so any future UNION / DISTINCT / GROUP BY over these columns would fail.
`jsonb` is also better for storage and indexing. No data loss: every value
is valid jsonb.

Revision ID: k0f1g2h3i4j5
Revises: j9e0f1g2h3i4
Create Date: 2026-05-24 21:45:00.000000

"""
from alembic import op


revision = "k0f1g2h3i4j5"
down_revision = ("j9e0f1g2h3i4", "7781b2f3ccfe")
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE contact "
        "ALTER COLUMN imessage_profile TYPE jsonb USING imessage_profile::jsonb"
    )
    op.execute(
        "ALTER TABLE activity_log "
        "ALTER COLUMN changes_json TYPE jsonb USING changes_json::jsonb"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE activity_log "
        "ALTER COLUMN changes_json TYPE json USING changes_json::json"
    )
    op.execute(
        "ALTER TABLE contact "
        "ALTER COLUMN imessage_profile TYPE json USING imessage_profile::json"
    )
