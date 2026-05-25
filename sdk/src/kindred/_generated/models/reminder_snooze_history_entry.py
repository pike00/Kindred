from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from dateutil.parser import isoparse
from typing import cast
import datetime


T = TypeVar("T", bound="ReminderSnoozeHistoryEntry")


@_attrs_define
class ReminderSnoozeHistoryEntry:
    """Single snooze history row returned by GET /reminders/{id}/snooze-history.

    Attributes:
        snoozed_at (datetime.datetime):
        snoozed_until (datetime.datetime):
        reason (None | str | Unset):
    """

    snoozed_at: datetime.datetime
    snoozed_until: datetime.datetime
    reason: None | str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        snoozed_at = self.snoozed_at.isoformat()

        snoozed_until = self.snoozed_until.isoformat()

        reason: None | str | Unset
        if isinstance(self.reason, Unset):
            reason = UNSET
        else:
            reason = self.reason

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "snoozed_at": snoozed_at,
                "snoozed_until": snoozed_until,
            }
        )
        if reason is not UNSET:
            field_dict["reason"] = reason

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        snoozed_at = isoparse(d.pop("snoozed_at"))

        snoozed_until = isoparse(d.pop("snoozed_until"))

        def _parse_reason(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        reason = _parse_reason(d.pop("reason", UNSET))

        reminder_snooze_history_entry = cls(
            snoozed_at=snoozed_at,
            snoozed_until=snoozed_until,
            reason=reason,
        )

        reminder_snooze_history_entry.additional_properties = d
        return reminder_snooze_history_entry

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
