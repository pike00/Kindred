from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.contact_field_type import ContactFieldType
from ..types import UNSET, Unset
from typing import cast






T = TypeVar("T", bound="ContactFieldUpdate")



@_attrs_define
class ContactFieldUpdate:
    """ 
        Attributes:
            field_type (ContactFieldType | None | Unset):
            label (None | str | Unset):
            value (None | str | Unset):
            is_primary (bool | None | Unset):
            sort_order (int | None | Unset):
     """

    field_type: ContactFieldType | None | Unset = UNSET
    label: None | str | Unset = UNSET
    value: None | str | Unset = UNSET
    is_primary: bool | None | Unset = UNSET
    sort_order: int | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        field_type: None | str | Unset
        if isinstance(self.field_type, Unset):
            field_type = UNSET
        elif isinstance(self.field_type, ContactFieldType):
            field_type = self.field_type.value
        else:
            field_type = self.field_type

        label: None | str | Unset
        if isinstance(self.label, Unset):
            label = UNSET
        else:
            label = self.label

        value: None | str | Unset
        if isinstance(self.value, Unset):
            value = UNSET
        else:
            value = self.value

        is_primary: bool | None | Unset
        if isinstance(self.is_primary, Unset):
            is_primary = UNSET
        else:
            is_primary = self.is_primary

        sort_order: int | None | Unset
        if isinstance(self.sort_order, Unset):
            sort_order = UNSET
        else:
            sort_order = self.sort_order


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
        })
        if field_type is not UNSET:
            field_dict["field_type"] = field_type
        if label is not UNSET:
            field_dict["label"] = label
        if value is not UNSET:
            field_dict["value"] = value
        if is_primary is not UNSET:
            field_dict["is_primary"] = is_primary
        if sort_order is not UNSET:
            field_dict["sort_order"] = sort_order

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        def _parse_field_type(data: object) -> ContactFieldType | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                field_type_type_0 = ContactFieldType(data)



                return field_type_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(ContactFieldType | None | Unset, data)

        field_type = _parse_field_type(d.pop("field_type", UNSET))


        def _parse_label(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        label = _parse_label(d.pop("label", UNSET))


        def _parse_value(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        value = _parse_value(d.pop("value", UNSET))


        def _parse_is_primary(data: object) -> bool | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(bool | None | Unset, data)

        is_primary = _parse_is_primary(d.pop("is_primary", UNSET))


        def _parse_sort_order(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        sort_order = _parse_sort_order(d.pop("sort_order", UNSET))


        contact_field_update = cls(
            field_type=field_type,
            label=label,
            value=value,
            is_primary=is_primary,
            sort_order=sort_order,
        )


        contact_field_update.additional_properties = d
        return contact_field_update

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
