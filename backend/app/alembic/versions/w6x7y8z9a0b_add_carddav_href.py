"""Track CardDAV client hrefs independently of contact IDs.

Revision ID: w6x7y8z9a0b
Revises: v5w6x7y8z9a
Create Date: 2026-11-02
"""

import sqlalchemy as sa

from alembic import op

revision = "w6x7y8z9a0b"
down_revision = "v5w6x7y8z9a"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "contact",
        sa.Column("vcard_href", sa.String(length=500), nullable=True),
    )
    op.create_index(
        "ix_contact_carddav_href",
        "contact",
        ["owner_id", "vcard_href"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_contact_carddav_href", table_name="contact")
    op.drop_column("contact", "vcard_href")
