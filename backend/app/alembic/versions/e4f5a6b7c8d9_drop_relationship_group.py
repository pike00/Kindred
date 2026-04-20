"""Drop relationship_group column and relationshipgroup enum.

Revision ID: e4f5a6b7c8d9
Revises: d3e4f5a6b7c8
Create Date: 2026-04-19 22:15:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic
revision = "e4f5a6b7c8d9"
down_revision = "d3e4f5a6b7c8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("relationship", "relationship_group")
    sa.Enum(name="relationshipgroup").drop(op.get_bind(), checkfirst=False)


def downgrade() -> None:
    relationship_group = sa.Enum(
        "FAMILY", "ROMANTIC", "FRIEND", "WORK", "OTHER", name="relationshipgroup"
    )
    relationship_group.create(op.get_bind(), checkfirst=False)
    op.add_column(
        "relationship",
        sa.Column(
            "relationship_group",
            relationship_group,
            nullable=False,
            server_default="OTHER",
        ),
    )
    op.alter_column("relationship", "relationship_group", server_default=None)
