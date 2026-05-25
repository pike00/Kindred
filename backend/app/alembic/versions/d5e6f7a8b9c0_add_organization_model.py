"""Add Organization model and link to Contact

Revision ID: d5e6f7a8b9c0
Revises: d98dd8ec85a3
Create Date: 2026-04-21 12:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlmodel import SQLModel

# revision identifiers, used by Alembic.
revision: str = "d5e6f7a8b9c0"
down_revision: Union[str, None] = "d98dd8ec85a3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create organization table
    op.create_table(
        "organization",
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("domain", sa.String(length=255), nullable=True),
        sa.Column("industry", sa.String(length=255), nullable=True),
        sa.Column("notes", sa.String(length=2000), nullable=True),
        sa.Column("address_label", sa.String(length=100), nullable=False, default="main"),
        sa.Column("address_street", sa.String(length=500), nullable=True),
        sa.Column("address_extended", sa.String(length=500), nullable=True),
        sa.Column("address_city", sa.String(length=255), nullable=True),
        sa.Column("address_region", sa.String(length=255), nullable=True),
        sa.Column("address_postal_code", sa.String(length=50), nullable=True),
        sa.Column("address_country", sa.String(length=255), nullable=True),
        sa.Column("address_latitude", sa.Float(), nullable=True),
        sa.Column("address_longitude", sa.Float(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("owner_id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_organization_owner_id", "organization", ["owner_id"], unique=False)

    # Add organization_id column to contact table
    op.add_column("contact", sa.Column("organization_id", sa.UUID(), nullable=True))
    op.create_foreign_key(
        "fk_contact_organization_id",
        "contact",
        "organization",
        ["organization_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    # Drop foreign key and column from contact
    op.drop_constraint("fk_contact_organization_id", "contact", type_="foreignkey")
    op.drop_column("contact", "organization_id")

    # Drop organization table
    op.drop_table("organization")
