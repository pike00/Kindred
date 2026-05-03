from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from dateutil.parser import isoparse
from typing import cast
from uuid import UUID
import datetime






T = TypeVar("T", bound="JournalEntryPublic")



@_attrs_define
class JournalEntryPublic:
    """ 
        Attributes:
            body (str): Entry body, 1-50000 chars.
            entry_date (datetime.date): Date the entry is about (may differ from created_at).
            id (UUID):
            created_at (datetime.datetime):
            updated_at (datetime.datetime):
            mood (None | str | Unset): Emoji or keyword capturing the mood.
     """

    body: str
    entry_date: datetime.date
    id: UUID
    created_at: datetime.datetime
    updated_at: datetime.datetime
    mood: None | str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        body = self.body

        entry_date = self.entry_date.isoformat()

        id = str(self.id)

        created_at = self.created_at.isoformat()

        updated_at = self.updated_at.isoformat()

        mood: None | str | Unset
        if isinstance(self.mood, Unset):
            mood = UNSET
        else:
            mood = self.mood


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
            "body": body,
            "entry_date": entry_date,
            "id": id,
            "created_at": created_at,
            "updated_at": updated_at,
        })
        if mood is not UNSET:
            field_dict["mood"] = mood

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        body = d.pop("body")

        entry_date = isoparse(d.pop("entry_date")).date()




        id = UUID(d.pop("id"))




        created_at = isoparse(d.pop("created_at"))




        updated_at = isoparse(d.pop("updated_at"))




        def _parse_mood(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        mood = _parse_mood(d.pop("mood", UNSET))


        journal_entry_public = cls(
            body=body,
            entry_date=entry_date,
            id=id,
            created_at=created_at,
            updated_at=updated_at,
            mood=mood,
        )


        journal_entry_public.additional_properties = d
        return journal_entry_public

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
