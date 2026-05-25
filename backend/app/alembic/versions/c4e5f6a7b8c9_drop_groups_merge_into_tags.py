"""Drop Group + ContactGroup; add description column to Tag.

Revision ID: c4e5f6a7b8c9
Revises: add_setup_state
Create Date: 2026-05-06 00:00:00.000000

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic
revision = "c4e5f6a7b8c9"
down_revision = "add_setup_state"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "tag",
        sa.Column("description", sa.String(length=1000), nullable=True),
    )
    op.drop_table("contact_group")
    op.drop_table("group")


def downgrade() -> None:
    import sqlalchemy.dialects.postgresql as postgresql

    op.create_table(
        "group",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.String(length=1000), nullable=True),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "contact_group",
        sa.Column("contact_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("group_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(["contact_id"], ["contact.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["group_id"], ["group.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("contact_id", "group_id"),
    )
    op.drop_column("tag", "description")
