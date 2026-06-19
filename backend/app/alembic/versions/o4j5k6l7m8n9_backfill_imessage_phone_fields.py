"""Backfill phone/email contact fields from iMessage handles.

Revision ID: o4j5k6l7m8n9
Revises: n3i4j5k6l7m8
Create Date: 2026-06-18 00:00:00.000000

iMessage-sourced contacts stored their handle only in `imessage_id` /
`source_external_id` (e.g. "imessage:+15055544644"), which feeds the source
badge but never the Contact Information card — that card renders typed
`contact_field` rows. Going forward the /imessage-sync handler writes the
field; this migration backfills contacts that were synced before that.

For each contact with an iMessage handle and no matching contact field, insert
one phone (or email) field labelled "iMessage", primary when the contact has
no other field of that type. Idempotent and data-only; downgrade removes the
rows it added (those labelled "iMessage" whose value matches the handle).
"""

import re
import uuid

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic
revision = "o4j5k6l7m8n9"
down_revision = "n3i4j5k6l7m8"
branch_labels = None
depends_on = None


def _derive(handle: str | None) -> tuple[str, str] | None:
    """Mirror app.models.derive_handle_contact_field, inlined so the migration
    stays self-contained. Returns (field_type, value) or None. field_type is
    the native enum LABEL ("PHONE"/"EMAIL"), i.e. the ContactFieldType member
    name as stored by SQLAlchemy — required for raw SQL against the enum."""
    if not handle:
        return None
    cleaned = re.sub(r"^[a-z]+:", "", handle.strip(), flags=re.IGNORECASE).strip()
    if not cleaned:
        return None
    if "@" in cleaned:
        return ("EMAIL", cleaned)
    if any(c.isdigit() for c in cleaned):
        return ("PHONE", cleaned)
    return None


def upgrade() -> None:
    conn = op.get_bind()
    rows = conn.execute(
        sa.text(
            """
            SELECT id, imessage_id, source_external_id
            FROM contact
            WHERE imessage_id IS NOT NULL
               OR source_external_id LIKE :pat
            """
        ),
        {"pat": "imessage:%"},
    ).fetchall()

    insert = sa.text(
        """
        INSERT INTO contact_field
            (id, contact_id, field_type, label, value, is_primary, sort_order)
        VALUES
            (:id, :contact_id, :field_type, 'iMessage', :value, :is_primary, 0)
        """
    )

    for row in rows:
        derived = _derive(row.imessage_id) or _derive(row.source_external_id)
        if derived is None:
            continue
        field_type, value = derived

        # Skip if this exact value is already stored for the contact.
        if conn.execute(
            sa.text(
                "SELECT 1 FROM contact_field "
                "WHERE contact_id = :cid AND value = :val LIMIT 1"
            ),
            {"cid": row.id, "val": value},
        ).first():
            continue

        has_same_type = conn.execute(
            sa.text(
                "SELECT 1 FROM contact_field "
                "WHERE contact_id = :cid AND field_type = :ft LIMIT 1"
            ),
            {"cid": row.id, "ft": field_type},
        ).first()

        conn.execute(
            insert,
            {
                "id": uuid.uuid4(),
                "contact_id": row.id,
                "field_type": field_type,
                "value": value,
                "is_primary": has_same_type is None,
            },
        )


def downgrade() -> None:
    # Remove only the fields this migration could have added: label 'iMessage'
    # on a contact carrying the matching handle.
    op.execute(
        """
        DELETE FROM contact_field cf
        USING contact c
        WHERE cf.contact_id = c.id
          AND cf.label = 'iMessage'
          AND (
                cf.value = regexp_replace(c.imessage_id, '^[a-z]+:', '', 'i')
             OR cf.value = regexp_replace(c.source_external_id, '^[a-z]+:', '', 'i')
          )
        """
    )
