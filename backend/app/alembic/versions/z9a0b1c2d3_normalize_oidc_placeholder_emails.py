"""Normalize invalid OIDC placeholder emails and merge release heads.

Revision ID: z9a0b1c2d3
Revises: ab12cd34ef56, y8z9a0b1c2
Create Date: 2026-11-04
"""

import sqlalchemy as sa

from alembic import op

revision = "z9a0b1c2d3"
down_revision = ("ab12cd34ef56", "y8z9a0b1c2")
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            UPDATE "user"
            SET email = lower(
                'oidc-' || md5(coalesce(oidc_sub, email)) || '@users.kindred.dev'
            )
            WHERE email LIKE '%@oidc.invalid'
            """
        )
    )


def downgrade() -> None:
    # The original invalid addresses cannot be reconstructed safely.
    pass
