from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

from ..types import UNSET, Unset

T = TypeVar("T", bound="JournalEntryCreate")


@_attrs_define
class JournalEntryCreate:
    """
    Attributes:
        body (str): Entry body, 1-50000 chars.
        entry_date (datetime.date): Date the entry is about (may differ from created_at).
        mood (None | str | Unset): Emoji or keyword capturing the mood.
    """

    body: str
    entry_date: datetime.date
    mood: None | str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        body = self.body

        entry_date = self.entry_date.isoformat()

        mood: None | str | Unset
        if isinstance(self.mood, Unset):
            mood = UNSET
        else:
            mood = self.mood

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "body": body,
                "entry_date": entry_date,
            }
        )
        if mood is not UNSET:
            field_dict["mood"] = mood

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        body = d.pop("body")

        entry_date = isoparse(d.pop("entry_date")).date()

        def _parse_mood(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        mood = _parse_mood(d.pop("mood", UNSET))

        journal_entry_create = cls(
            body=body,
            entry_date=entry_date,
            mood=mood,
        )

        journal_entry_create.additional_properties = d
        return journal_entry_create

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
