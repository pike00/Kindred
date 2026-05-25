"""Add email_oauth_token table for storing encrypted OAuth tokens.

Revision ID: h7c8d9e0f1g2
Revises: g6b7c8d9e0f1
Create Date: 2026-05-02 22:10:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "h7c8d9e0f1g2"
down_revision = "g6b7c8d9e0f1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "email_oauth_token",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("contact_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("provider", sa.String(length=50), nullable=False, server_default="gmail"),
        sa.Column("email_address", sa.String(length=255), nullable=False),
        sa.Column("encrypted_access_token", sa.Text(), nullable=False),
        sa.Column("encrypted_refresh_token", sa.Text(), nullable=True),
        sa.Column("token_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["contact_id"], ["contact.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["owner_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_email_oauth_token_owner_id", "email_oauth_token", ["owner_id"], unique=False
    )
    op.create_index(
        "ix_email_oauth_token_contact_id", "email_oauth_token", ["contact_id"], unique=False
    )
    op.create_index(
        "ix_email_oauth_token_email_address",
        "email_oauth_token",
        ["email_address"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_email_oauth_token_email_address", "email_oauth_token")
    op.drop_index("ix_email_oauth_token_contact_id", "email_oauth_token")
    op.drop_index("ix_email_oauth_token_owner_id", "email_oauth_token")
    op.drop_table("email_oauth_token")
