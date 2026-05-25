from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

from ..models.interaction_channel import InteractionChannel
from ..types import UNSET, Unset

T = TypeVar("T", bound="InteractionCreate")


@_attrs_define
class InteractionCreate:
    """
    Attributes:
        channel (InteractionChannel):
        occurred_at (datetime.datetime): When the interaction actually took place.
        attendee_ids (list[UUID]): Contacts that attended; must have at least one.
        notes (None | str | Unset): Conversation summary, action items, etc.
        mood (None | str | Unset): Emoji or keyword capturing the tone.
        duration_minutes (int | None | Unset): Length of the interaction in minutes.
    """

    channel: InteractionChannel
    occurred_at: datetime.datetime
    attendee_ids: list[UUID]
    notes: None | str | Unset = UNSET
    mood: None | str | Unset = UNSET
    duration_minutes: int | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        channel = self.channel.value

        occurred_at = self.occurred_at.isoformat()

        attendee_ids = []
        for attendee_ids_item_data in self.attendee_ids:
            attendee_ids_item = str(attendee_ids_item_data)
            attendee_ids.append(attendee_ids_item)

        notes: None | str | Unset
        if isinstance(self.notes, Unset):
            notes = UNSET
        else:
            notes = self.notes

        mood: None | str | Unset
        if isinstance(self.mood, Unset):
            mood = UNSET
        else:
            mood = self.mood

        duration_minutes: int | None | Unset
        if isinstance(self.duration_minutes, Unset):
            duration_minutes = UNSET
        else:
            duration_minutes = self.duration_minutes

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "channel": channel,
                "occurred_at": occurred_at,
                "attendee_ids": attendee_ids,
            }
        )
        if notes is not UNSET:
            field_dict["notes"] = notes
        if mood is not UNSET:
            field_dict["mood"] = mood
        if duration_minutes is not UNSET:
            field_dict["duration_minutes"] = duration_minutes

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        channel = InteractionChannel(d.pop("channel"))

        occurred_at = isoparse(d.pop("occurred_at"))

        attendee_ids = []
        _attendee_ids = d.pop("attendee_ids")
        for attendee_ids_item_data in _attendee_ids:
            attendee_ids_item = UUID(attendee_ids_item_data)

            attendee_ids.append(attendee_ids_item)

        def _parse_notes(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        notes = _parse_notes(d.pop("notes", UNSET))

        def _parse_mood(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        mood = _parse_mood(d.pop("mood", UNSET))

        def _parse_duration_minutes(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        duration_minutes = _parse_duration_minutes(d.pop("duration_minutes", UNSET))

        interaction_create = cls(
            channel=channel,
            occurred_at=occurred_at,
            attendee_ids=attendee_ids,
            notes=notes,
            mood=mood,
            duration_minutes=duration_minutes,
        )

        interaction_create.additional_properties = d
        return interaction_create

    @property
    def additional_keys(self) -> list[str]:
        return list(self.additional_properties.keys())

    def __getitem__(self, key: str) -> Any:
        return self.additional_properties[key]

    def __setitem__(self, key: str, value: Any) -> None:
        self.additional_properties[key] = value

    def __delitem__(self, key: str) -> None:
        del self.additional_properties[key]

    def __contains__(self, key: str) -> bool:
        return key in self.additional_properties
