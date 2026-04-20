"""Narrow contactfieldtype enum to EMAIL and PHONE only.

Drops contact_field rows with field_type in (URL, SOCIAL, IM, CUSTOM),
then rebuilds the contactfieldtype enum without those values.

Revision ID: f5a6b7c8d9e0
Revises: e4f5a6b7c8d9
Create Date: 2026-04-19 23:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic
revision = "f5a6b7c8d9e0"
down_revision = "e4f5a6b7c8d9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()

    op.execute(
        "DELETE FROM contact_field WHERE field_type IN ('URL', 'SOCIAL', 'IM', 'CUSTOM')"
    )

    op.execute("ALTER TYPE contactfieldtype RENAME TO contactfieldtype_old")
    sa.Enum("EMAIL", "PHONE", name="contactfieldtype").create(bind, checkfirst=False)
    op.execute(
        "ALTER TABLE contact_field "
        "ALTER COLUMN field_type TYPE contactfieldtype "
        "USING field_type::text::contactfieldtype"
    )
    op.execute("DROP TYPE contactfieldtype_old")


def downgrade() -> None:
    bind = op.get_bind()

    op.execute("ALTER TYPE contactfieldtype RENAME TO contactfieldtype_old")
    sa.Enum(
        "EMAIL", "PHONE", "URL", "SOCIAL", "IM", "CUSTOM", name="contactfieldtype"
    ).create(bind, checkfirst=False)
    op.execute(
        "ALTER TABLE contact_field "
        "ALTER COLUMN field_type TYPE contactfieldtype "
        "USING field_type::text::contactfieldtype"
    )
    op.execute("DROP TYPE contactfieldtype_old")
