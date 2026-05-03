"""Add source_provider and source_external_id to contact for re-import dedup.

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-04-28 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


revision = "add_oauth_contact_provenance"
down_revision = "add_do_not_contact_fields"
branch_labels = None
depends_on = None


CONTACT_SOURCE = sa.Enum("MANUAL", "GOOGLE", "ICLOUD", name="contactsource")


def upgrade() -> None:
    CONTACT_SOURCE.create(op.get_bind(), checkfirst=False)
    op.add_column(
        "contact",
        sa.Column(
            "source_provider",
            CONTACT_SOURCE,
            nullable=False,
            server_default="MANUAL",
        ),
    )
    op.add_column(
        "contact",
        sa.Column("source_external_id", sa.String(length=255), nullable=True),
    )
    op.create_index(
        "ix_contact_source_provider", "contact", ["source_provider"]
    )
    op.create_index(
        "ix_contact_source_external_id", "contact", ["source_external_id"]
    )
    # Partial unique: same provider can't issue two contacts with the same
    # external ID for the same owner. Skipped when external_id is null
    # (manual entries don't have one).
    op.create_index(
        "ux_contact_owner_provider_external",
        "contact",
        ["owner_id", "source_provider", "source_external_id"],
        unique=True,
        postgresql_where=sa.text("source_external_id IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("ux_contact_owner_provider_external", "contact")
    op.drop_index("ix_contact_source_external_id", "contact")
    op.drop_index("ix_contact_source_provider", "contact")
    op.drop_column("contact", "source_external_id")
    op.drop_column("contact", "source_provider")
    CONTACT_SOURCE.drop(op.get_bind(), checkfirst=False)
