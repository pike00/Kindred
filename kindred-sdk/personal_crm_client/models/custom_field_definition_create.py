from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast






T = TypeVar("T", bound="CustomFieldDefinitionCreate")



@_attrs_define
class CustomFieldDefinitionCreate:
    """ 
        Attributes:
            name (str): Custom field name shown in the UI.
            field_type (str | Unset): Field type: text, number, date, boolean, or select. Default: 'text'.
            description (None | str | Unset): Help text displayed alongside the field in the UI.
            options (None | str | Unset): Comma-separated options for field_type="select".
            icon (None | str | Unset): Icon slug for the UI (e.g. "heart", "book").
     """

    name: str
    field_type: str | Unset = 'text'
    description: None | str | Unset = UNSET
    options: None | str | Unset = UNSET
    icon: None | str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        name = self.name

        field_type = self.field_type

        description: None | str | Unset
        if isinstance(self.description, Unset):
            description = UNSET
        else:
            description = self.description

        options: None | str | Unset
        if isinstance(self.options, Unset):
            options = UNSET
        else:
            options = self.options

        icon: None | str | Unset
        if isinstance(self.icon, Unset):
            icon = UNSET
        else:
            icon = self.icon


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
            "name": name,
        })
        if field_type is not UNSET:
            field_dict["field_type"] = field_type
        if description is not UNSET:
            field_dict["description"] = description
        if options is not UNSET:
            field_dict["options"] = options
        if icon is not UNSET:
            field_dict["icon"] = icon

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        name = d.pop("name")

        field_type = d.pop("field_type", UNSET)

        def _parse_description(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        description = _parse_description(d.pop("description", UNSET))


        def _parse_options(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        options = _parse_options(d.pop("options", UNSET))


        def _parse_icon(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        icon = _parse_icon(d.pop("icon", UNSET))


        custom_field_definition_create = cls(
            name=name,
            field_type=field_type,
            description=description,
            options=options,
            icon=icon,
        )


        custom_field_definition_create.additional_properties = d
        return custom_field_definition_create

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
