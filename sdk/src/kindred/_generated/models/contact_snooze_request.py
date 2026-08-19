from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast
import datetime


T = TypeVar("T", bound="ContactSnoozeRequest")


@_attrs_define
class ContactSnoozeRequest:
    """
    Attributes:
        duration (None | str | Unset): Snooze duration: '1w', '2w', '1m', '1 month', '3m', '3 months', '6m', '6 months',
            'indefinitely'
        snoozed_until (datetime.datetime | None | Unset): Explicit snoozed_until datetime UTC.
    """

    duration: None | str | Unset = UNSET
    snoozed_until: datetime.datetime | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        duration: None | str | Unset
        if isinstance(self.duration, Unset):
            duration = UNSET
        else:
            duration = self.duration

        snoozed_until: None | str | Unset
        if isinstance(self.snoozed_until, Unset):
            snoozed_until = UNSET
        elif isinstance(self.snoozed_until, datetime.datetime):
            snoozed_until = self.snoozed_until.isoformat()
        else:
            snoozed_until = self.snoozed_until

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if duration is not UNSET:
            field_dict["duration"] = duration
        if snoozed_until is not UNSET:
            field_dict["snoozed_until"] = snoozed_until

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)

        def _parse_duration(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        duration = _parse_duration(d.pop("duration", UNSET))

        def _parse_snoozed_until(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                snoozed_until_type_0 = datetime.datetime.fromisoformat(data)

                return snoozed_until_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        snoozed_until = _parse_snoozed_until(d.pop("snoozed_until", UNSET))

        contact_snooze_request = cls(
            duration=duration,
            snoozed_until=snoozed_until,
        )

        contact_snooze_request.additional_properties = d
        return contact_snooze_request

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
