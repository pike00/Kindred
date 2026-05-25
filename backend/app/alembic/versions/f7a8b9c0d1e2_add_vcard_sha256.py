"""Add vcard_sha256 column to Contact table for round-trip integrity.

Revision ID: f7a8b9c0d1e2
Revises: e5f6a7b8c9d0
Create Date: 2026-05-03 10:00:00.000000

This column stores SHA256(vcard_raw) to detect content drift
when CardDAV clients sync contact updates.
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic
revision = "add_vcard_sha256"
down_revision = "001_add_saved_filter"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add vcard_sha256 column to contact table."""
    op.add_column(
        "contact",
        sa.Column("vcard_sha256", sa.String(length=64), nullable=True),
    )
    op.create_index(
        "ix_contact_vcard_sha256",
        "contact",
        ["vcard_sha256"],
    )


def downgrade() -> None:
    """Remove vcard_sha256 column from contact table."""
    op.drop_index("ix_contact_vcard_sha256", "contact")
    op.drop_column("contact", "vcard_sha256")
