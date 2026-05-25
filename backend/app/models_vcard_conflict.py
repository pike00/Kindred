"""vCard conflict detection models for round-trip integrity verification."""

import uuid
from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


class VCardConflictBase(SQLModel):
    """Base model for vCard sync conflicts."""

    contact_id: uuid.UUID = Field(
        description="The contact that has a conflict.",
    )
    incoming_vcard_raw: str = Field(
        description="The raw vCard text from the incoming CardDAV PUT request.",
    )
    incoming_hash: str = Field(
        max_length=64,
        description="SHA-256 hash of the incoming normalized vCard.",
    )
    local_hash: str = Field(
        max_length=64,
        description="SHA-256 hash of the locally-stored normalized vCard at time of conflict.",
    )
    resolved_at: datetime | None = Field(
        default=None,
        description="When the conflict was resolved; None means pending.",
    )
    resolution_type: str | None = Field(
        default=None,
        max_length=50,
        description="How the conflict was resolved: 'keep_local', 'accept_remote', 'manual_merge'.",
    )


class VCardConflict(VCardConflictBase, table=True):
    """Table model for vCard sync conflicts requiring user review."""

    __tablename__ = "vcard_conflict"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        description="Primary key.",
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
        description="When the conflict was detected (UTC).",
    )


class VCardConflictPublic(VCardConflictBase):
    """Public schema for returning conflict data to the API."""

    id: uuid.UUID
    created_at: datetime
    incoming_vcard_raw: str  # Include in public for diff UI
    local_vcard_raw: str | None = Field(
        default=None,
        description="The locally-stored vCard at time of conflict.",
    )


class VCardConflictsPublic(SQLModel):
    """Paginated response for listing conflicts."""

    data: list[VCardConflictPublic]
    count: int
