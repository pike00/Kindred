from __future__ import annotations

import uuid
from datetime import date, datetime

from pydantic import BaseModel, computed_field


# ── Read models (mirrors *Public shapes from personal-crm) ───────────────────


class Group(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None = None
    created_at: datetime


class Contact(BaseModel):
    id: uuid.UUID
    first_name: str
    last_name: str | None = None
    middle_name: str | None = None
    nickname: str | None = None
    company: str | None = None
    title: str | None = None
    birthday: date | None = None
    how_we_met: str | None = None
    stage: str | None = None
    source: str | None = None
    source_external_id: str | None = None
    is_favorite: bool = False
    is_archived: bool = False
    is_deceased: bool = False
    do_not_contact: bool = False
    contact_frequency_days: int | None = None
    avatar_url: str | None = None
    last_contacted_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    groups: list[Group] = []

    @computed_field  # type: ignore[misc]
    @property
    def display_name(self) -> str:
        parts = [self.first_name]
        if self.last_name:
            parts.append(self.last_name)
        return " ".join(parts)


class Relationship(BaseModel):
    id: uuid.UUID
    relationship_type: str
    notes: str | None = None
    contact_id: uuid.UUID
    related_contact_id: uuid.UUID
    inverse_id: uuid.UUID | None = None


class Note(BaseModel):
    id: uuid.UUID
    body: str
    contact_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


# ── Write models ─────────────────────────────────────────────────────────────


class ContactCreate(BaseModel):
    first_name: str
    last_name: str | None = None
    nickname: str | None = None
    company: str | None = None
    title: str | None = None
    birthday: date | None = None
    how_we_met: str | None = None
    stage: str | None = None
    source: str | None = None
    source_external_id: str | None = None
    contact_frequency_days: int | None = None
    group_ids: list[uuid.UUID] | None = None


class ContactUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    nickname: str | None = None
    company: str | None = None
    title: str | None = None
    birthday: date | None = None
    how_we_met: str | None = None
    stage: str | None = None
    source_external_id: str | None = None
    contact_frequency_days: int | None = None
    group_ids: list[uuid.UUID] | None = None


class RelationshipCreate(BaseModel):
    contact_id: uuid.UUID
    related_contact_id: uuid.UUID
    relationship_type: str
    inverse_relationship_type: str | None = None
    notes: str | None = None


class RelationshipUpdate(BaseModel):
    relationship_type: str | None = None
    notes: str | None = None


class NoteCreate(BaseModel):
    contact_id: uuid.UUID
    body: str


class NoteUpdate(BaseModel):
    body: str | None = None
