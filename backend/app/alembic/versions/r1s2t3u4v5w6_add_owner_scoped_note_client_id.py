"""Add owner-scoped note idempotency keys.

Revision ID: r1s2t3u4v5w6
Revises: add_contact_snoozed_until, q6r7s8t9u0
Create Date: 2026-11-02
"""

import sqlalchemy as sa

from alembic import op

revision = "r1s2t3u4v5w6"
down_revision = ("add_contact_snoozed_until", "q6r7s8t9u0")
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Keep the oldest note for each legacy duplicate key and release the retry
    # key on later duplicates so no note data is deleted.
    op.execute(
        sa.text(
            """
            WITH ranked AS (
                SELECT id,
                       row_number() OVER (
                           PARTITION BY owner_id, client_id
                           ORDER BY created_at, id
                       ) AS duplicate_number
                FROM note
                WHERE client_id IS NOT NULL
            )
            UPDATE note
            SET client_id = NULL
            FROM ranked
            WHERE note.id = ranked.id
              AND ranked.duplicate_number > 1
            """
        )
    )
    op.create_index(
        "uq_note_owner_client_id",
        "note",
        ["owner_id", "client_id"],
        unique=True,
        postgresql_where=sa.text("client_id IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_note_owner_client_id", table_name="note")
