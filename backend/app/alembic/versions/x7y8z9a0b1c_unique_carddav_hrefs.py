"""Make CardDAV hrefs unique per owner.

Revision ID: x7y8z9a0b1c
Revises: w6x7y8z9a0b
Create Date: 2026-11-02
"""

import sqlalchemy as sa

from alembic import op

revision = "x7y8z9a0b1c"
down_revision = "w6x7y8z9a0b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_index("ix_contact_carddav_href", table_name="contact")
    op.create_index(
        "uq_contact_owner_carddav_href",
        "contact",
        ["owner_id", "vcard_href"],
        unique=True,
        postgresql_where=sa.text("vcard_href IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_contact_owner_carddav_href", table_name="contact")
    op.create_index(
        "ix_contact_carddav_href",
        "contact",
        ["owner_id", "vcard_href"],
        unique=False,
    )
