"""Add ical_import_log table for iCal event deduplication

Revision ID: add_ical_import_log
Revises: add_vcard_sha256
Create Date: 2026-05-24 00:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "add_ical_import_log"
down_revision = "f7a8b9c0d1e2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ical_import_log",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("owner_id", sa.UUID(), sa.ForeignKey("user.id", ondelete="CASCADE"), nullable=False),
        sa.Column("uid", sa.String(length=2048), nullable=False),
        sa.Column("contact_id", sa.UUID(), sa.ForeignKey("contact.id", ondelete="CASCADE"), nullable=True),
        sa.Column("event_type", sa.String(length=50), nullable=False),
        sa.Column("imported_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("owner_id", "uid", name="uq_ical_import_owner_uid"),
    )
    op.create_index("ix_ical_import_log_owner_id", "ical_import_log", ["owner_id"])
    op.create_index("ix_ical_import_log_uid", "ical_import_log", ["uid"])


def downgrade() -> None:
    op.drop_index("ix_ical_import_log_uid", "ical_import_log")
    op.drop_index("ix_ical_import_log_owner_id", "ical_import_log")
    op.drop_table("ical_import_log")
