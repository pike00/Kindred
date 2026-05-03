"""Add contact provenance fields (source, source_external_id).

Revision ID: add_contact_provenance
Revises: e5f6a7b8c9d0
Create Date: 2026-05-02 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic
revision = "add_contact_provenance"
down_revision = "e5f6a7b8c9d0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add source, source_external_id columns and unique constraint."""
    # Create enum type for contact source
    op.execute(
        "CREATE TYPE contactsource AS ENUM ('MANUAL', 'VCARD_IMPORT', 'CARDDAV', 'GOOGLE', 'WEBHOOK')"
    )

    # Add source column with default value
    op.add_column(
        "contact",
        sa.Column(
            "source",
            sa.Enum(
                "MANUAL",
                "VCARD_IMPORT",
                "CARDDAV",
                "GOOGLE",
                "WEBHOOK",
                name="contactsource",
                create_type=False,
            ),
            nullable=False,
            server_default="MANUAL",
        ),
    )

    # Add source_external_id column
    op.add_column(
        "contact",
        sa.Column("source_external_id", sa.String(length=500), nullable=True),
    )

    # Backfill existing rows: source=manual, source_external_id=null (already handled by defaults)

    # Add unique constraint for idempotent upserts
    # Note: We need to handle the NULL case - PostgreSQL treats NULLs as distinct values,
    # so multiple rows with NULL source_external_id are allowed per (owner_id, source).
    # This is the desired behavior - multiple manual contacts without external IDs.
    op.create_unique_constraint(
        "uq_contact_owner_source_external_id",
        "contact",
        ["owner_id", "source", "source_external_id"],
    )


def downgrade() -> None:
    """Remove source, source_external_id columns and unique constraint."""
    # Drop unique constraint
    op.drop_constraint(
        "uq_contact_owner_source_external_id",
        "contact",
        type_="unique",
    )

    # Drop columns
    op.drop_column("contact", "source_external_id")
    op.drop_column("contact", "source")

    # Drop enum type
    op.execute("DROP TYPE IF EXISTS contactsource")
