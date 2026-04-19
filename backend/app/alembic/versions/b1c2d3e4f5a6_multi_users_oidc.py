"""Multi-user OIDC: oidc columns + tag_share table

Revision ID: b1c2d3e4f5a6
Revises: a1b2c3d4e5f6
Create Date: 2026-04-18 00:00:00.000000
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "b1c2d3e4f5a6"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade():
    # User: add oidc_iss / oidc_sub columns + indexes + unique constraint
    op.add_column(
        "user",
        sa.Column("oidc_iss", sa.String(length=512), nullable=True),
    )
    op.add_column(
        "user",
        sa.Column("oidc_sub", sa.String(length=255), nullable=True),
    )
    op.create_index("ix_user_oidc_iss", "user", ["oidc_iss"])
    op.create_index("ix_user_oidc_sub", "user", ["oidc_sub"])
    op.create_unique_constraint(
        "uq_user_oidc_identity", "user", ["oidc_iss", "oidc_sub"]
    )

    # User: make hashed_password nullable (OIDC users have no password)
    op.alter_column(
        "user",
        "hashed_password",
        existing_type=sa.String(),
        nullable=True,
    )

    # tag_share table
    op.create_table(
        "tag_share",
        sa.Column("tag_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("grantee_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["tag_id"], ["tag.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["grantee_id"], ["user.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("tag_id", "grantee_id"),
    )


def downgrade():
    op.drop_table("tag_share")
    op.alter_column(
        "user",
        "hashed_password",
        existing_type=sa.String(),
        nullable=False,
    )
    op.drop_constraint("uq_user_oidc_identity", "user", type_="unique")
    op.drop_index("ix_user_oidc_sub", table_name="user")
    op.drop_index("ix_user_oidc_iss", table_name="user")
    op.drop_column("user", "oidc_sub")
    op.drop_column("user", "oidc_iss")
