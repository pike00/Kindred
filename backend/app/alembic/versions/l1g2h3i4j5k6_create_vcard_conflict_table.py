"""Create vcard_conflict table.

The VCardConflict SQLModel exists (app/models_vcard_conflict.py) and the API
route uses it (app/api/routes/vcard_conflicts.py) but no migration ever
created the table — every list request 500'd with `relation "vcard_conflict"
does not exist`.

Revision ID: l1g2h3i4j5k6
Revises: k0f1g2h3i4j5
Create Date: 2026-05-25 08:00:00.000000

"""
import sqlalchemy as sa
from alembic import op


revision = "l1g2h3i4j5k6"
down_revision = "k0f1g2h3i4j5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "vcard_conflict",
        sa.Column(
            "id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
        ),
        sa.Column(
            "contact_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("contact.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("incoming_vcard_raw", sa.Text(), nullable=False),
        sa.Column("incoming_hash", sa.String(length=64), nullable=False),
        sa.Column("local_hash", sa.String(length=64), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolution_type", sa.String(length=50), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_vcard_conflict_contact_id",
        "vcard_conflict",
        ["contact_id"],
    )
    op.create_index(
        "ix_vcard_conflict_resolved_at",
        "vcard_conflict",
        ["resolved_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_vcard_conflict_resolved_at", table_name="vcard_conflict")
    op.drop_index("ix_vcard_conflict_contact_id", table_name="vcard_conflict")
    op.drop_table("vcard_conflict")
