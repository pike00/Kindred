from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from uuid import UUID






T = TypeVar("T", bound="CustomFieldValueCreate")



@_attrs_define
class CustomFieldValueCreate:
    """ 
        Attributes:
            value (str): Value as a string; coerced from the declared field_type.
            contact_id (UUID):
            field_definition_id (UUID):
     """

    value: str
    contact_id: UUID
    field_definition_id: UUID
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        value = self.value

        contact_id = str(self.contact_id)

        field_definition_id = str(self.field_definition_id)


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
            "value": value,
            "contact_id": contact_id,
            "field_definition_id": field_definition_id,
        })

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        value = d.pop("value")

        contact_id = UUID(d.pop("contact_id"))




        field_definition_id = UUID(d.pop("field_definition_id"))




        custom_field_value_create = cls(
            value=value,
            contact_id=contact_id,
            field_definition_id=field_definition_id,
        )


        custom_field_value_create.additional_properties = d
        return custom_field_value_create

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
