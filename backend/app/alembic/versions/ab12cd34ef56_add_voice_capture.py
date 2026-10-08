"""Add durable owner-scoped voice captures."""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "ab12cd34ef56"
down_revision = ("add_contact_snoozed_until", "q6r7s8t9u0")
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "voice_capture",
        sa.Column(
            "id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False
        ),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("raw_text", sa.Text(), nullable=False),
        sa.Column("corrected_text", sa.Text(), nullable=False),
        sa.Column("timezone", sa.String(length=100), nullable=False),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "status", sa.String(length=20), nullable=False, server_default="draft"
        ),
        sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
        sa.Column(
            "actions",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "warnings",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
        sa.Column("analysis_error", sa.String(length=500), nullable=True),
        sa.Column("committed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("commit_hash", sa.String(length=64), nullable=True),
        sa.Column("results", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.create_index("ix_voice_capture_owner_id", "voice_capture", ["owner_id"])
    op.create_index("ix_voice_capture_commit_hash", "voice_capture", ["commit_hash"])


def downgrade() -> None:
    op.drop_index("ix_voice_capture_commit_hash", table_name="voice_capture")
    op.drop_index("ix_voice_capture_owner_id", table_name="voice_capture")
    op.drop_table("voice_capture")
