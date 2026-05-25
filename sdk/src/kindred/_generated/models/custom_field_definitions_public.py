from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from typing import cast

if TYPE_CHECKING:
    from ..models.custom_field_definition_public import CustomFieldDefinitionPublic


T = TypeVar("T", bound="CustomFieldDefinitionsPublic")


@_attrs_define
class CustomFieldDefinitionsPublic:
    """
    Attributes:
        data (list[CustomFieldDefinitionPublic]):
        count (int):
    """

    data: list[CustomFieldDefinitionPublic]
    count: int
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.custom_field_definition_public import CustomFieldDefinitionPublic

        data = []
        for data_item_data in self.data:
            data_item = data_item_data.to_dict()
            data.append(data_item)

        count = self.count

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "data": data,
                "count": count,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.custom_field_definition_public import CustomFieldDefinitionPublic

        d = dict(src_dict)
        data = []
        _data = d.pop("data")
        for data_item_data in _data:
            data_item = CustomFieldDefinitionPublic.from_dict(data_item_data)

            data.append(data_item)

        count = d.pop("count")

        custom_field_definitions_public = cls(
            data=data,
            count=count,
        )

        custom_field_definitions_public.additional_properties = d
        return custom_field_definitions_public

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
