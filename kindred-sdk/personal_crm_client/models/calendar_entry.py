from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from typing import cast
from uuid import UUID






T = TypeVar("T", bound="CalendarEntry")



@_attrs_define
class CalendarEntry:
    """ 
        Attributes:
            contact_id (UUID):
            name (str):
            type_ (str):
            age (int | None):
     """

    contact_id: UUID
    name: str
    type_: str
    age: int | None
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        contact_id = str(self.contact_id)

        name = self.name

        type_ = self.type_

        age: int | None
        age = self.age


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
            "contact_id": contact_id,
            "name": name,
            "type": type_,
            "age": age,
        })

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        contact_id = UUID(d.pop("contact_id"))




        name = d.pop("name")

        type_ = d.pop("type")

        def _parse_age(data: object) -> int | None:
            if data is None:
                return data
            return cast(int | None, data)

        age = _parse_age(d.pop("age"))


        calendar_entry = cls(
            contact_id=contact_id,
            name=name,
            type_=type_,
            age=age,
        )


        calendar_entry.additional_properties = d
        return calendar_entry

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
