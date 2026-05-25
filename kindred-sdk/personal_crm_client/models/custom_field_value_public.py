from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="CustomFieldValuePublic")


@_attrs_define
class CustomFieldValuePublic:
    """
    Attributes:
        value (str): Value as a string; coerced from the declared field_type.
        id (UUID):
        contact_id (UUID):
        field_definition_id (UUID):
        field_name (None | str | Unset):
    """

    value: str
    id: UUID
    contact_id: UUID
    field_definition_id: UUID
    field_name: None | str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        value = self.value

        id = str(self.id)

        contact_id = str(self.contact_id)

        field_definition_id = str(self.field_definition_id)

        field_name: None | str | Unset
        if isinstance(self.field_name, Unset):
            field_name = UNSET
        else:
            field_name = self.field_name

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "value": value,
                "id": id,
                "contact_id": contact_id,
                "field_definition_id": field_definition_id,
            }
        )
        if field_name is not UNSET:
            field_dict["field_name"] = field_name

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        value = d.pop("value")

        id = UUID(d.pop("id"))

        contact_id = UUID(d.pop("contact_id"))

        field_definition_id = UUID(d.pop("field_definition_id"))

        def _parse_field_name(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        field_name = _parse_field_name(d.pop("field_name", UNSET))

        custom_field_value_public = cls(
            value=value,
            id=id,
            contact_id=contact_id,
            field_definition_id=field_definition_id,
            field_name=field_name,
        )

        custom_field_value_public.additional_properties = d
        return custom_field_value_public

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
