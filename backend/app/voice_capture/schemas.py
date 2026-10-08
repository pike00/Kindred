from __future__ import annotations

import enum
import uuid
from datetime import date, datetime
from typing import Annotated, Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Channel(str, enum.Enum):
    CALL = "call"
    IN_PERSON = "in_person"
    TEXT = "text"
    EMAIL = "email"
    VIDEO = "video"
    SOCIAL = "social"
    OTHER = "other"


class Frequency(str, enum.Enum):
    ONCE = "once"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"


class ActionBase(StrictModel):
    id: uuid.UUID
    kind: str
    enabled: bool = True
    evidence: str = Field(max_length=1000)
    review_warning: str | None = Field(default=None, max_length=500)


class InteractionAction(ActionBase):
    kind: Literal["interaction"]
    attendee_ids: list[uuid.UUID] = Field(default_factory=list, max_length=20)
    channel: Channel | None = None
    occurred_at: datetime | None = None
    notes: str | None = Field(default=None, max_length=10000)
    duration_minutes: int | None = Field(default=None, ge=0, le=10000)
    location_label: str | None = Field(default=None, max_length=500)

    @field_validator("occurred_at")
    @classmethod
    def aware_occurrence(cls, value: datetime | None) -> datetime | None:
        if value is not None and value.utcoffset() is None:
            raise ValueError("occurred_at must include a timezone")
        return value


class NoteAction(ActionBase):
    kind: Literal["note"]
    contact_id: uuid.UUID | None = None
    body: str = Field(max_length=50000)


class TextContactFieldChange(StrictModel):
    field: Literal[
        "company", "department", "title", "nickname", "pronouns", "how_we_met"
    ]
    value: str | None


class BirthdayFieldChange(StrictModel):
    field: Literal["birthday"]
    value: date | None


ContactFieldChange = Annotated[
    TextContactFieldChange | BirthdayFieldChange,
    Field(discriminator="field"),
]


class ContactUpdateAction(ActionBase):
    kind: Literal["contact_update"]
    contact_id: uuid.UUID | None = None
    fields: list[ContactFieldChange] = Field(max_length=7)

    @model_validator(mode="after")
    def unique_fields(self) -> ContactUpdateAction:
        names = [change.field for change in self.fields]
        if len(names) != len(set(names)):
            raise ValueError("contact update fields must not repeat")
        return self


class LifeEventAction(ActionBase):
    kind: Literal["life_event"]
    contact_id: uuid.UUID | None = None
    event_type: str = Field(max_length=100)
    title: str = Field(max_length=500)
    description: str | None = Field(default=None, max_length=2000)
    occurred_at: date | None = None
    create_annual_reminder: Literal[False] = False


class ReminderAction(ActionBase):
    kind: Literal["reminder"]
    contact_id: uuid.UUID | None = None
    title: str = Field(max_length=500)
    description: str | None = Field(default=None, max_length=2000)
    remind_at: datetime | None = None
    frequency: Frequency = Frequency.ONCE
    is_active: Literal[True] = True

    @field_validator("remind_at")
    @classmethod
    def aware_reminder(cls, value: datetime | None) -> datetime | None:
        if value is not None and value.utcoffset() is None:
            raise ValueError("remind_at must include a timezone")
        return value


VoiceAction = Annotated[
    InteractionAction
    | NoteAction
    | ContactUpdateAction
    | LifeEventAction
    | ReminderAction,
    Field(discriminator="kind"),
]


class VoiceProposal(StrictModel):
    corrected_text: str = Field(min_length=1, max_length=100000)
    actions: list[VoiceAction] = Field(max_length=50)
    warnings: list[str] = Field(default_factory=list, max_length=50)


class CreateCapture(StrictModel):
    raw_text: str = Field(min_length=1, max_length=100000)
    timezone: str = Field(min_length=1, max_length=100)

    @field_validator("timezone")
    @classmethod
    def valid_timezone(cls, value: str) -> str:
        try:
            ZoneInfo(value)
        except (ValueError, ZoneInfoNotFoundError) as exc:
            raise ValueError("timezone must be a valid IANA timezone") from exc
        return value


class AnalyzeCapture(StrictModel):
    revision: int = Field(ge=1)
    text: str | None = Field(default=None, min_length=1, max_length=100000)


class ReviewCapture(StrictModel):
    revision: int = Field(ge=1)
    corrected_text: str = Field(min_length=1, max_length=100000)
    actions: list[VoiceAction] = Field(max_length=50)


def validate_enabled_action(action: VoiceAction) -> None:
    if not action.evidence.strip():
        raise ValueError("enabled actions need source evidence")
    if isinstance(action, InteractionAction):
        if (
            not action.attendee_ids
            or action.channel is None
            or action.occurred_at is None
        ):
            raise ValueError(
                "enabled interactions need attendees, channel, and occurrence time"
            )
    elif isinstance(action, NoteAction):
        if not action.body.strip():
            raise ValueError("enabled notes need text")
    elif isinstance(action, ContactUpdateAction):
        if not action.fields:
            raise ValueError("enabled contact updates need at least one field")
        if any(
            change.value is not None
            and isinstance(change.value, str)
            and not change.value.strip()
            for change in action.fields
        ):
            raise ValueError(
                "enabled contact update fields need a value or explicit null"
            )
    elif isinstance(action, LifeEventAction):
        if (
            not action.event_type.strip()
            or not action.title.strip()
            or action.occurred_at is None
        ):
            raise ValueError("enabled life events need a type, title, and date")
    elif isinstance(action, ReminderAction):
        if not action.title.strip() or action.remind_at is None:
            raise ValueError("enabled reminders need a title and date")


class VoiceCapturePublic(StrictModel):
    id: uuid.UUID
    raw_text: str
    corrected_text: str
    timezone: str
    recorded_at: datetime
    created_at: datetime
    updated_at: datetime
    status: Literal["draft", "ready", "committed"]
    revision: int
    actions: list[VoiceAction]
    warnings: list[str]
    analysis_error: str | None = None
    committed_at: datetime | None = None
    results: dict | None = None


class VoiceCapturesPublic(StrictModel):
    data: list[VoiceCapturePublic]
    count: int


class TranscriptionResponse(StrictModel):
    text: str
    language: str | None = None
    duration: float | None = None
    capture_id: uuid.UUID


class WhisperTranscription(StrictModel):
    model_config = ConfigDict(extra="ignore", strict=True)

    text: str = Field(min_length=1, max_length=100000)
    language: str | None = None
    duration: float | None = Field(default=None, ge=0, allow_inf_nan=False)
