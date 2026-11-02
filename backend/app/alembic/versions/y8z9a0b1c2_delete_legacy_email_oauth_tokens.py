"""Delete pre-encryption Gmail OAuth credentials.

Revision ID: y8z9a0b1c2
Revises: x7y8z9a0b1c
Create Date: 2026-11-02
"""

import sqlalchemy as sa

from alembic import op

revision = "y8z9a0b1c2"
down_revision = "x7y8z9a0b1c"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Earlier releases stored raw OAuth tokens in encrypted_* columns. Delete
    # them rather than leave long-lived credentials exposed at rest; users
    # reauthorize their mailboxes through the existing OAuth flow.
    op.execute(sa.text("DELETE FROM email_oauth_token"))


def downgrade() -> None:
    # Credentials cannot be reconstructed; reauthorization is required.
    pass
