from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.interaction_channel import InteractionChannel
from ..types import UNSET, Unset
from typing import cast
from uuid import UUID
import datetime


T = TypeVar("T", bound="InteractionUpdate")


@_attrs_define
class InteractionUpdate:
    """
    Attributes:
        channel (InteractionChannel | None | Unset):
        occurred_at (datetime.datetime | None | Unset):
        notes (None | str | Unset):
        duration_minutes (int | None | Unset):
        attendee_ids (list[UUID] | None | Unset): Replace the attendee set; must have at least one if provided.
    """

    channel: InteractionChannel | None | Unset = UNSET
    occurred_at: datetime.datetime | None | Unset = UNSET
    notes: None | str | Unset = UNSET
    duration_minutes: int | None | Unset = UNSET
    attendee_ids: list[UUID] | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        channel: None | str | Unset
        if isinstance(self.channel, Unset):
            channel = UNSET
        elif isinstance(self.channel, InteractionChannel):
            channel = self.channel.value
        else:
            channel = self.channel

        occurred_at: None | str | Unset
        if isinstance(self.occurred_at, Unset):
            occurred_at = UNSET
        elif isinstance(self.occurred_at, datetime.datetime):
            occurred_at = self.occurred_at.isoformat()
        else:
            occurred_at = self.occurred_at

        notes: None | str | Unset
        if isinstance(self.notes, Unset):
            notes = UNSET
        else:
            notes = self.notes

        duration_minutes: int | None | Unset
        if isinstance(self.duration_minutes, Unset):
            duration_minutes = UNSET
        else:
            duration_minutes = self.duration_minutes

        attendee_ids: list[str] | None | Unset
        if isinstance(self.attendee_ids, Unset):
            attendee_ids = UNSET
        elif isinstance(self.attendee_ids, list):
            attendee_ids = []
            for attendee_ids_type_0_item_data in self.attendee_ids:
                attendee_ids_type_0_item = str(attendee_ids_type_0_item_data)
                attendee_ids.append(attendee_ids_type_0_item)

        else:
            attendee_ids = self.attendee_ids

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if channel is not UNSET:
            field_dict["channel"] = channel
        if occurred_at is not UNSET:
            field_dict["occurred_at"] = occurred_at
        if notes is not UNSET:
            field_dict["notes"] = notes
        if duration_minutes is not UNSET:
            field_dict["duration_minutes"] = duration_minutes
        if attendee_ids is not UNSET:
            field_dict["attendee_ids"] = attendee_ids

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)

        def _parse_channel(data: object) -> InteractionChannel | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                channel_type_0 = InteractionChannel(data)

                return channel_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(InteractionChannel | None | Unset, data)

        channel = _parse_channel(d.pop("channel", UNSET))

        def _parse_occurred_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                occurred_at_type_0 = datetime.datetime.fromisoformat(data)

                return occurred_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        occurred_at = _parse_occurred_at(d.pop("occurred_at", UNSET))

        def _parse_notes(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        notes = _parse_notes(d.pop("notes", UNSET))

        def _parse_duration_minutes(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        duration_minutes = _parse_duration_minutes(d.pop("duration_minutes", UNSET))

        def _parse_attendee_ids(data: object) -> list[UUID] | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, list):
                    raise TypeError()
                attendee_ids_type_0 = []
                _attendee_ids_type_0 = data
                for attendee_ids_type_0_item_data in _attendee_ids_type_0:
                    attendee_ids_type_0_item = UUID(attendee_ids_type_0_item_data)

                    attendee_ids_type_0.append(attendee_ids_type_0_item)

                return attendee_ids_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(list[UUID] | None | Unset, data)

        attendee_ids = _parse_attendee_ids(d.pop("attendee_ids", UNSET))

        interaction_update = cls(
            channel=channel,
            occurred_at=occurred_at,
            notes=notes,
            duration_minutes=duration_minutes,
            attendee_ids=attendee_ids,
        )

        interaction_update.additional_properties = d
        return interaction_update

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
