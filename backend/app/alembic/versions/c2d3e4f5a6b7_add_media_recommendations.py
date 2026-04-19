"""Add media recommendations table.

Revision ID: c2d3e4f5a6b7
Revises: b1c2d3e4f5a6
Create Date: 2026-04-19 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic
revision = "c2d3e4f5a6b7"
down_revision = "b1c2d3e4f5a6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create media_recommendation table."""
    op.create_table(
        "media_recommendation",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("contact_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "category",
            sa.Enum(
                "MOVIE",
                "TV_SHOW",
                "PODCAST",
                "MUSICIAN",
                "BOOK",
                "OTHER",
                name="mediacategory",
            ),
            nullable=False,
        ),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("creator", sa.String(length=500), nullable=True),
        sa.Column("note", sa.String(length=5000), nullable=True),
        sa.Column("recommended_at", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["user.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["contact_id"], ["contact.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_media_recommendation_contact_id"),
        "media_recommendation",
        ["contact_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_media_recommendation_owner_id"),
        "media_recommendation",
        ["owner_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_media_recommendation_category"),
        "media_recommendation",
        ["category"],
        unique=False,
    )


def downgrade() -> None:
    """Drop media_recommendation table."""
    op.drop_index(
        op.f("ix_media_recommendation_category"), table_name="media_recommendation"
    )
    op.drop_index(
        op.f("ix_media_recommendation_owner_id"), table_name="media_recommendation"
    )
    op.drop_index(
        op.f("ix_media_recommendation_contact_id"), table_name="media_recommendation"
    )
    op.drop_table("media_recommendation")
    sa.Enum(name="mediacategory").drop(op.get_bind(), checkfirst=False)
