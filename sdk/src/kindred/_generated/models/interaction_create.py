from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.interaction_channel import InteractionChannel
from ..types import UNSET, Unset
from dateutil.parser import isoparse
from typing import cast
from uuid import UUID
import datetime


T = TypeVar("T", bound="InteractionCreate")


@_attrs_define
class InteractionCreate:
    """
    Attributes:
        channel (InteractionChannel):
        occurred_at (datetime.datetime): When the interaction actually took place.
        attendee_ids (list[UUID]): Contacts that attended; must have at least one.
        notes (None | str | Unset): Conversation summary, action items, etc.
        duration_minutes (int | None | Unset): Length of the interaction in minutes.
        is_draft (bool | Unset):  Default: False.
        draft_source (None | str | Unset):
        location_label (None | str | Unset):
        latitude (float | None | Unset):
        longitude (float | None | Unset):
    """

    channel: InteractionChannel
    occurred_at: datetime.datetime
    attendee_ids: list[UUID]
    notes: None | str | Unset = UNSET
    duration_minutes: int | None | Unset = UNSET
    is_draft: bool | Unset = False
    draft_source: None | str | Unset = UNSET
    location_label: None | str | Unset = UNSET
    latitude: float | None | Unset = UNSET
    longitude: float | None | Unset = UNSET
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

        duration_minutes: int | None | Unset
        if isinstance(self.duration_minutes, Unset):
            duration_minutes = UNSET
        else:
            duration_minutes = self.duration_minutes

        is_draft = self.is_draft

        draft_source: None | str | Unset
        if isinstance(self.draft_source, Unset):
            draft_source = UNSET
        else:
            draft_source = self.draft_source

        location_label: None | str | Unset
        if isinstance(self.location_label, Unset):
            location_label = UNSET
        else:
            location_label = self.location_label

        latitude: float | None | Unset
        if isinstance(self.latitude, Unset):
            latitude = UNSET
        else:
            latitude = self.latitude

        longitude: float | None | Unset
        if isinstance(self.longitude, Unset):
            longitude = UNSET
        else:
            longitude = self.longitude

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
        if duration_minutes is not UNSET:
            field_dict["duration_minutes"] = duration_minutes
        if is_draft is not UNSET:
            field_dict["is_draft"] = is_draft
        if draft_source is not UNSET:
            field_dict["draft_source"] = draft_source
        if location_label is not UNSET:
            field_dict["location_label"] = location_label
        if latitude is not UNSET:
            field_dict["latitude"] = latitude
        if longitude is not UNSET:
            field_dict["longitude"] = longitude

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

        def _parse_duration_minutes(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        duration_minutes = _parse_duration_minutes(d.pop("duration_minutes", UNSET))

        is_draft = d.pop("is_draft", UNSET)

        def _parse_draft_source(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        draft_source = _parse_draft_source(d.pop("draft_source", UNSET))

        def _parse_location_label(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        location_label = _parse_location_label(d.pop("location_label", UNSET))

        def _parse_latitude(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        latitude = _parse_latitude(d.pop("latitude", UNSET))

        def _parse_longitude(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        longitude = _parse_longitude(d.pop("longitude", UNSET))

        interaction_create = cls(
            channel=channel,
            occurred_at=occurred_at,
            attendee_ids=attendee_ids,
            notes=notes,
            duration_minutes=duration_minutes,
            is_draft=is_draft,
            draft_source=draft_source,
            location_label=location_label,
            latitude=latitude,
            longitude=longitude,
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
