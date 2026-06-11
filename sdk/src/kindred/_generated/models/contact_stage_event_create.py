from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast
from uuid import UUID
import datetime


T = TypeVar("T", bound="ContactStageEventCreate")


@_attrs_define
class ContactStageEventCreate:
    """
    Attributes:
        occurred_at (datetime.datetime): When the transition happened (UTC).
        contact_id (UUID):
        from_stage (None | str | Unset): Previous stage; null for the initial seed event.
        to_stage (None | str | Unset): New stage; null when clearing stage (rare).
        note (None | str | Unset): Optional context about why the stage changed.
    """

    occurred_at: datetime.datetime
    contact_id: UUID
    from_stage: None | str | Unset = UNSET
    to_stage: None | str | Unset = UNSET
    note: None | str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        occurred_at = self.occurred_at.isoformat()

        contact_id = str(self.contact_id)

        from_stage: None | str | Unset
        if isinstance(self.from_stage, Unset):
            from_stage = UNSET
        else:
            from_stage = self.from_stage

        to_stage: None | str | Unset
        if isinstance(self.to_stage, Unset):
            to_stage = UNSET
        else:
            to_stage = self.to_stage

        note: None | str | Unset
        if isinstance(self.note, Unset):
            note = UNSET
        else:
            note = self.note

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "occurred_at": occurred_at,
                "contact_id": contact_id,
            }
        )
        if from_stage is not UNSET:
            field_dict["from_stage"] = from_stage
        if to_stage is not UNSET:
            field_dict["to_stage"] = to_stage
        if note is not UNSET:
            field_dict["note"] = note

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        occurred_at = datetime.datetime.fromisoformat(d.pop("occurred_at"))

        contact_id = UUID(d.pop("contact_id"))

        def _parse_from_stage(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        from_stage = _parse_from_stage(d.pop("from_stage", UNSET))

        def _parse_to_stage(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        to_stage = _parse_to_stage(d.pop("to_stage", UNSET))

        def _parse_note(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        note = _parse_note(d.pop("note", UNSET))

        contact_stage_event_create = cls(
            occurred_at=occurred_at,
            contact_id=contact_id,
            from_stage=from_stage,
            to_stage=to_stage,
            note=note,
        )

        contact_stage_event_create.additional_properties = d
        return contact_stage_event_create

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
