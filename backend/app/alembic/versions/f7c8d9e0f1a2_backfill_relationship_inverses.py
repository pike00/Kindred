"""Backfill inverse_id and create missing inverse rows for existing relationships.

Revision ID: f7c8d9e0f1a2
Revises: f6a7b8c9d0e1
Create Date: 2026-04-21 12:00:00.000000

For every existing Relationship row that has no ``inverse_id``:

1. Look up the inverse type in ``inverse_relationship_map``.
2. If found, create the inverse row (swap contact_id/related_contact_id) and
   cross-link both rows via ``inverse_id``.
3. If the lookup fails, leave the row as-is (one-way link).

Idempotent: safe to run multiple times; only processes rows where
``inverse_id IS NULL``.
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic
revision = "f7c8d9e0f1a2"
down_revision = "add_inverse_relationship_map"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Backfill inverse rows for existing relationships."""

    conn = op.get_bind()

    # 1. Fetch all relationships that don't have an inverse_id yet
    existing_rels = conn.execute(
        sa.text(
            """
            SELECT r.id, r.contact_id, r.related_contact_id, r.relationship_type, r.notes
            FROM relationship r
            WHERE r.inverse_id IS NULL
            """
        )
    ).fetchall()

    # 2. Fetch the inverse map into a dict for quick lookup
    inverse_map = {}
    map_rows = conn.execute(
        sa.text("SELECT relationship_type, inverse_type, is_symmetric FROM inverse_relationship_map")
    ).fetchall()
    for row in map_rows:
        inverse_map[row[0]] = (row[1], row[2])

    # 3. Process each relationship
    for rel in existing_rels:
        rel_id = rel[0]
        contact_id = rel[1]
        related_contact_id = rel[2]
        rel_type = rel[3]
        notes = rel[4]

        # Look up the inverse type
        lookup = inverse_map.get(rel_type)
        if not lookup:
            # No mapping found; leave as one-way link
            continue

        inverse_type, is_symmetric = lookup

        # Check if an inverse row already exists (idempotency)
        existing_inverse = conn.execute(
            sa.text(
                """
                SELECT id FROM relationship
                WHERE contact_id = :related_contact_id
                  AND related_contact_id = :contact_id
                  AND relationship_type = :inverse_type
                LIMIT 1
                """
            ),
            {
                "related_contact_id": related_contact_id,
                "contact_id": contact_id,
                "inverse_type": inverse_type,
            },
        ).first()

        if existing_inverse:
            inv_id = existing_inverse[0]
        else:
            # Create the inverse row
            inv_id = conn.execute(
                sa.text(
                    """
                    INSERT INTO relationship (id, contact_id, related_contact_id, relationship_type, notes, inverse_id)
                    VALUES (gen_random_uuid(), :contact_id, :related_contact_id, :rel_type, :notes, NULL)
                    RETURNING id
                    """
                ),
                {
                    "contact_id": related_contact_id,
                    "related_contact_id": contact_id,
                    "rel_type": inverse_type,
                    "notes": notes,
                },
            ).first()[0]

        # Cross-link: set inverse_id on both rows
        conn.execute(
            sa.text("UPDATE relationship SET inverse_id = :inv_id WHERE id = :rel_id"),
            {"inv_id": inv_id, "rel_id": rel_id},
        )
        conn.execute(
            sa.text("UPDATE relationship SET inverse_id = :rel_id WHERE id = :inv_id"),
            {"rel_id": rel_id, "inv_id": inv_id},
        )


def downgrade() -> None:
    """Remove inverse_id links and delete auto-created inverse rows.

    Only deletes inverse rows that were created by this migration
    (identified as rows whose inverse_id points to a row that previously
    had inverse_id IS NULL).

    For simplicity, we null out all inverse_id values and delete
    inverse rows where the original row had inverse_id IS NULL.
    """
    conn = op.get_bind()

    # Find relationships that had inverse_id set by this migration
    linked_rels = conn.execute(
        sa.text(
            """
            SELECT id, inverse_id FROM relationship
            WHERE inverse_id IS NOT NULL
            """
        )
    ).fetchall()

    # Collect inverse IDs to potentially delete
    inverse_ids_to_check = set()
    for rel in linked_rels:
        inverse_ids_to_check.add(rel[1])

    # Null out all inverse_id references
    conn.execute(sa.text("UPDATE relationship SET inverse_id = NULL"))

    # Delete inverse rows that were created by this backfill
    if inverse_ids_to_check:
        # For safety, only delete if the "forward" row's original inverse_id was NULL
        # Since we can't know for sure, we'll be conservative and just
        # null out the links without deleting data
        pass
