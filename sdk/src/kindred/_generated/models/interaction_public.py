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

if TYPE_CHECKING:
    from ..models.interaction_attendee_summary import InteractionAttendeeSummary


T = TypeVar("T", bound="InteractionPublic")


@_attrs_define
class InteractionPublic:
    """
    Attributes:
        channel (InteractionChannel):
        occurred_at (datetime.datetime): When the interaction actually took place.
        id (UUID):
        created_at (datetime.datetime):
        notes (None | str | Unset): Conversation summary, action items, etc.
        duration_minutes (int | None | Unset): Length of the interaction in minutes.
        attendees (list[InteractionAttendeeSummary] | Unset):
        deleted_at (datetime.datetime | None | Unset):
        is_draft (bool | Unset):  Default: False.
        draft_source (None | str | Unset):
        location_label (None | str | Unset):
        latitude (float | None | Unset):
        longitude (float | None | Unset):
    """

    channel: InteractionChannel
    occurred_at: datetime.datetime
    id: UUID
    created_at: datetime.datetime
    notes: None | str | Unset = UNSET
    duration_minutes: int | None | Unset = UNSET
    attendees: list[InteractionAttendeeSummary] | Unset = UNSET
    deleted_at: datetime.datetime | None | Unset = UNSET
    is_draft: bool | Unset = False
    draft_source: None | str | Unset = UNSET
    location_label: None | str | Unset = UNSET
    latitude: float | None | Unset = UNSET
    longitude: float | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.interaction_attendee_summary import InteractionAttendeeSummary

        channel = self.channel.value

        occurred_at = self.occurred_at.isoformat()

        id = str(self.id)

        created_at = self.created_at.isoformat()

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

        attendees: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.attendees, Unset):
            attendees = []
            for attendees_item_data in self.attendees:
                attendees_item = attendees_item_data.to_dict()
                attendees.append(attendees_item)

        deleted_at: None | str | Unset
        if isinstance(self.deleted_at, Unset):
            deleted_at = UNSET
        elif isinstance(self.deleted_at, datetime.datetime):
            deleted_at = self.deleted_at.isoformat()
        else:
            deleted_at = self.deleted_at

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
                "id": id,
                "created_at": created_at,
            }
        )
        if notes is not UNSET:
            field_dict["notes"] = notes
        if duration_minutes is not UNSET:
            field_dict["duration_minutes"] = duration_minutes
        if attendees is not UNSET:
            field_dict["attendees"] = attendees
        if deleted_at is not UNSET:
            field_dict["deleted_at"] = deleted_at
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
        from ..models.interaction_attendee_summary import InteractionAttendeeSummary

        d = dict(src_dict)
        channel = InteractionChannel(d.pop("channel"))

        occurred_at = datetime.datetime.fromisoformat(d.pop("occurred_at"))

        id = UUID(d.pop("id"))

        created_at = datetime.datetime.fromisoformat(d.pop("created_at"))

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

        _attendees = d.pop("attendees", UNSET)
        attendees: list[InteractionAttendeeSummary] | Unset = UNSET
        if _attendees is not UNSET:
            attendees = []
            for attendees_item_data in _attendees:
                attendees_item = InteractionAttendeeSummary.from_dict(attendees_item_data)

                attendees.append(attendees_item)

        def _parse_deleted_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                deleted_at_type_0 = datetime.datetime.fromisoformat(data)

                return deleted_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        deleted_at = _parse_deleted_at(d.pop("deleted_at", UNSET))

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

        interaction_public = cls(
            channel=channel,
            occurred_at=occurred_at,
            id=id,
            created_at=created_at,
            notes=notes,
            duration_minutes=duration_minutes,
            attendees=attendees,
            deleted_at=deleted_at,
            is_draft=is_draft,
            draft_source=draft_source,
            location_label=location_label,
            latitude=latitude,
            longitude=longitude,
        )

        interaction_public.additional_properties = d
        return interaction_public

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
