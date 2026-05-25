from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast


T = TypeVar("T", bound="ChronicSnoozer")


@_attrs_define
class ChronicSnoozer:
    """Aggregate snooze stats for a (contact, reminder) pair.

    Attributes:
        reminder_id (str):
        snooze_count (int):
        contact_id (None | str | Unset):
    """

    reminder_id: str
    snooze_count: int
    contact_id: None | str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        reminder_id = self.reminder_id

        snooze_count = self.snooze_count

        contact_id: None | str | Unset
        if isinstance(self.contact_id, Unset):
            contact_id = UNSET
        else:
            contact_id = self.contact_id

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "reminder_id": reminder_id,
                "snooze_count": snooze_count,
            }
        )
        if contact_id is not UNSET:
            field_dict["contact_id"] = contact_id

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        reminder_id = d.pop("reminder_id")

        snooze_count = d.pop("snooze_count")

        def _parse_contact_id(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        contact_id = _parse_contact_id(d.pop("contact_id", UNSET))

        chronic_snoozer = cls(
            reminder_id=reminder_id,
            snooze_count=snooze_count,
            contact_id=contact_id,
        )

        chronic_snoozer.additional_properties = d
        return chronic_snoozer

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
