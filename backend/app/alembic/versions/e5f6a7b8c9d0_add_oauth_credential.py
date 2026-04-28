"""Add oauth_credential table for storing encrypted import-provider tokens.

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-04-28 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "e5f6a7b8c9d0"
down_revision = "d4e5f6a7b8c9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "oauth_credential",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "provider",
            sa.Enum("GOOGLE", name="oauthprovider"),
            nullable=False,
        ),
        sa.Column("encrypted_refresh_token", sa.String(), nullable=False),
        sa.Column("encrypted_access_token", sa.String(), nullable=True),
        sa.Column(
            "access_token_expires_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column("scopes", sa.String(length=2000), nullable=False, server_default=""),
        sa.Column("sync_token", sa.String(length=4000), nullable=True),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id", "provider", name="uq_oauth_credential_user_provider"
        ),
    )
    op.create_index(
        op.f("ix_oauth_credential_user_id"),
        "oauth_credential",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_oauth_credential_provider"),
        "oauth_credential",
        ["provider"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_oauth_credential_provider"), table_name="oauth_credential"
    )
    op.drop_index(
        op.f("ix_oauth_credential_user_id"), table_name="oauth_credential"
    )
    op.drop_table("oauth_credential")
    sa.Enum(name="oauthprovider").drop(op.get_bind(), checkfirst=False)
