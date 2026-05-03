"""Add api_key + api_key_impersonate tables and activity_log.acting_api_key_id.

Revision ID: add_api_key_auth
Revises: add_contact_provenance
Create Date: 2026-05-02 16:00:00.000000

API keys are bearer tokens for machine-to-machine access. Each key is
hashed with sha256 (column ``key_hash``); the plaintext is shown once at
creation. ``api_key_impersonate`` whitelists which users a key may act as
when the client passes ``X-On-Behalf-Of: <user_id>``.
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic
revision = "add_api_key_auth"
down_revision = "add_contact_provenance"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "api_key",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("key_hash", sa.String(length=64), nullable=False),
        sa.Column("key_prefix", sa.String(length=16), nullable=False),
        sa.Column("owned_by_user_id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["owned_by_user_id"], ["user.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("key_hash", name="uq_api_key_key_hash"),
    )
    op.create_index("ix_api_key_key_hash", "api_key", ["key_hash"])
    op.create_index(
        "ix_api_key_owned_by_user_id", "api_key", ["owned_by_user_id"]
    )

    op.create_table(
        "api_key_impersonate",
        sa.Column("api_key_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(
            ["api_key_id"], ["api_key.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("api_key_id", "user_id"),
    )

    op.add_column(
        "activity_log",
        sa.Column("acting_api_key_id", sa.Uuid(), nullable=True),
    )
    op.create_foreign_key(
        "fk_activity_log_acting_api_key_id",
        "activity_log",
        "api_key",
        ["acting_api_key_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_activity_log_acting_api_key_id",
        "activity_log",
        ["acting_api_key_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_activity_log_acting_api_key_id", "activity_log")
    op.drop_constraint(
        "fk_activity_log_acting_api_key_id", "activity_log", type_="foreignkey"
    )
    op.drop_column("activity_log", "acting_api_key_id")

    op.drop_table("api_key_impersonate")

    op.drop_index("ix_api_key_owned_by_user_id", "api_key")
    op.drop_index("ix_api_key_key_hash", "api_key")
    op.drop_table("api_key")
