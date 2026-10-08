from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.channel import Channel
from ..types import UNSET, Unset
from dateutil.parser import isoparse
from typing import cast
from typing import Literal, cast
from uuid import UUID
import datetime


T = TypeVar("T", bound="InteractionAction")


@_attrs_define
class InteractionAction:
    """
    Attributes:
        id (UUID):
        kind (Literal['interaction']):
        evidence (str):
        enabled (bool | Unset):  Default: True.
        review_warning (None | str | Unset):
        attendee_ids (list[UUID] | Unset):
        channel (Channel | None | Unset):
        occurred_at (datetime.datetime | None | Unset):
        notes (None | str | Unset):
        duration_minutes (int | None | Unset):
        location_label (None | str | Unset):
    """

    id: UUID
    kind: Literal["interaction"]
    evidence: str
    enabled: bool | Unset = True
    review_warning: None | str | Unset = UNSET
    attendee_ids: list[UUID] | Unset = UNSET
    channel: Channel | None | Unset = UNSET
    occurred_at: datetime.datetime | None | Unset = UNSET
    notes: None | str | Unset = UNSET
    duration_minutes: int | None | Unset = UNSET
    location_label: None | str | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        id = str(self.id)

        kind = self.kind

        evidence = self.evidence

        enabled = self.enabled

        review_warning: None | str | Unset
        if isinstance(self.review_warning, Unset):
            review_warning = UNSET
        else:
            review_warning = self.review_warning

        attendee_ids: list[str] | Unset = UNSET
        if not isinstance(self.attendee_ids, Unset):
            attendee_ids = []
            for attendee_ids_item_data in self.attendee_ids:
                attendee_ids_item = str(attendee_ids_item_data)
                attendee_ids.append(attendee_ids_item)

        channel: None | str | Unset
        if isinstance(self.channel, Unset):
            channel = UNSET
        elif isinstance(self.channel, Channel):
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

        location_label: None | str | Unset
        if isinstance(self.location_label, Unset):
            location_label = UNSET
        else:
            location_label = self.location_label

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "id": id,
                "kind": kind,
                "evidence": evidence,
            }
        )
        if enabled is not UNSET:
            field_dict["enabled"] = enabled
        if review_warning is not UNSET:
            field_dict["review_warning"] = review_warning
        if attendee_ids is not UNSET:
            field_dict["attendee_ids"] = attendee_ids
        if channel is not UNSET:
            field_dict["channel"] = channel
        if occurred_at is not UNSET:
            field_dict["occurred_at"] = occurred_at
        if notes is not UNSET:
            field_dict["notes"] = notes
        if duration_minutes is not UNSET:
            field_dict["duration_minutes"] = duration_minutes
        if location_label is not UNSET:
            field_dict["location_label"] = location_label

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        id = UUID(d.pop("id"))

        kind = cast(Literal["interaction"], d.pop("kind"))
        if kind != "interaction":
            raise ValueError(f"kind must match const 'interaction', got '{kind}'")

        evidence = d.pop("evidence")

        enabled = d.pop("enabled", UNSET)

        def _parse_review_warning(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        review_warning = _parse_review_warning(d.pop("review_warning", UNSET))

        _attendee_ids = d.pop("attendee_ids", UNSET)
        attendee_ids: list[UUID] | Unset = UNSET
        if _attendee_ids is not UNSET:
            attendee_ids = []
            for attendee_ids_item_data in _attendee_ids:
                attendee_ids_item = UUID(attendee_ids_item_data)

                attendee_ids.append(attendee_ids_item)

        def _parse_channel(data: object) -> Channel | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                channel_type_0 = Channel(data)

                return channel_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(Channel | None | Unset, data)

        channel = _parse_channel(d.pop("channel", UNSET))

        def _parse_occurred_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                occurred_at_type_0 = isoparse(data)

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

        def _parse_location_label(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        location_label = _parse_location_label(d.pop("location_label", UNSET))

        interaction_action = cls(
            id=id,
            kind=kind,
            evidence=evidence,
            enabled=enabled,
            review_warning=review_warning,
            attendee_ids=attendee_ids,
            channel=channel,
            occurred_at=occurred_at,
            notes=notes,
            duration_minutes=duration_minutes,
            location_label=location_label,
        )

        return interaction_action
