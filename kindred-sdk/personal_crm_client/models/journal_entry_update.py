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






T = TypeVar("T", bound="JournalEntryUpdate")



@_attrs_define
class JournalEntryUpdate:
    """ 
        Attributes:
            body (None | str | Unset):
            mood (None | str | Unset):
            entry_date (datetime.date | None | Unset):
     """

    body: None | str | Unset = UNSET
    mood: None | str | Unset = UNSET
    entry_date: datetime.date | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        body: None | str | Unset
        if isinstance(self.body, Unset):
            body = UNSET
        else:
            body = self.body

        mood: None | str | Unset
        if isinstance(self.mood, Unset):
            mood = UNSET
        else:
            mood = self.mood

        entry_date: None | str | Unset
        if isinstance(self.entry_date, Unset):
            entry_date = UNSET
        elif isinstance(self.entry_date, datetime.date):
            entry_date = self.entry_date.isoformat()
        else:
            entry_date = self.entry_date


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
        })
        if body is not UNSET:
            field_dict["body"] = body
        if mood is not UNSET:
            field_dict["mood"] = mood
        if entry_date is not UNSET:
            field_dict["entry_date"] = entry_date

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        def _parse_body(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        body = _parse_body(d.pop("body", UNSET))


        def _parse_mood(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        mood = _parse_mood(d.pop("mood", UNSET))


        def _parse_entry_date(data: object) -> datetime.date | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                entry_date_type_0 = isoparse(data).date()



                return entry_date_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.date | None | Unset, data)

        entry_date = _parse_entry_date(d.pop("entry_date", UNSET))


        journal_entry_update = cls(
            body=body,
            mood=mood,
            entry_date=entry_date,
        )


        journal_entry_update.additional_properties = d
        return journal_entry_update

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
