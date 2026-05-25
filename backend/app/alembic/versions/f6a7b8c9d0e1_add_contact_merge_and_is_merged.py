"""Add contact_merge table and is_merged flag to contact.

Revision ID: f6a7b8c9d0e1
Revises: f5a6b7c8d9e0
Create Date: 2026-05-02 12:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic
revision = "add_contact_merge_history"
down_revision = "a0b1c2d3e4f5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add is_merged column to contact table
    op.add_column(
        "contact",
        sa.Column("is_merged", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.create_index(
        "ix_contact_is_merged",
        "contact",
        ["is_merged"],
    )
    # Add merged_into_id column to contact table
    op.add_column(
        "contact",
        sa.Column(
            "merged_into_id",
            sa.Uuid(),
            sa.ForeignKey("contact.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )

    # Create contact_merge table
    op.create_table(
        "contact_merge",
        sa.Column("id", sa.Uuid(), nullable=False, primary_key=True),
        sa.Column(
            "surviving_id",
            sa.Uuid(),
            sa.ForeignKey("contact.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "absorbed_id",
            sa.Uuid(),
            sa.ForeignKey("contact.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
            unique=True,  # Each absorbed contact can only be merged once
        ),
        sa.Column(
            "merged_by",
            sa.Uuid(),
            sa.ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "merged_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("notes", sa.String(length=1000), nullable=True),
    )
    op.create_index("ix_contact_merge_merged_at", "contact_merge", ["merged_at"])
    op.create_index(
        "ix_contact_merge_surviving_absorbed",
        "contact_merge",
        ["surviving_id", "absorbed_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_contact_merge_surviving_absorbed", "contact_merge")
    op.drop_index("ix_contact_merge_merged_at", "contact_merge")
    op.drop_table("contact_merge")
    op.drop_index("ix_contact_is_merged", "contact")
    op.drop_column("contact", "is_merged")
    # merged_into_id may not exist in all environments due to partial migration
    from alembic import op as _op
    from sqlalchemy import inspect
    conn = _op.get_bind()
    inspector = inspect(conn)
    cols = [c["name"] for c in inspector.get_columns("contact")]
    if "merged_into_id" in cols:
        op.drop_column("contact", "merged_into_id")
