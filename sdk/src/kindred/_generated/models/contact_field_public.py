from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.contact_field_type import ContactFieldType
from ..types import UNSET, Unset
from uuid import UUID


T = TypeVar("T", bound="ContactFieldPublic")


@_attrs_define
class ContactFieldPublic:
    """
    Attributes:
        field_type (ContactFieldType):
        label (str): Label like "home", "work", "cell", "twitter".
        value (str): The actual email address, phone number, etc.
        id (UUID):
        contact_id (UUID):
        is_primary (bool | Unset): Marks the primary entry for this field_type on the contact. Default: False.
        sort_order (int | Unset): Display order within the same field_type. Default: 0.
    """

    field_type: ContactFieldType
    label: str
    value: str
    id: UUID
    contact_id: UUID
    is_primary: bool | Unset = False
    sort_order: int | Unset = 0
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        field_type = self.field_type.value

        label = self.label

        value = self.value

        id = str(self.id)

        contact_id = str(self.contact_id)

        is_primary = self.is_primary

        sort_order = self.sort_order

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "field_type": field_type,
                "label": label,
                "value": value,
                "id": id,
                "contact_id": contact_id,
            }
        )
        if is_primary is not UNSET:
            field_dict["is_primary"] = is_primary
        if sort_order is not UNSET:
            field_dict["sort_order"] = sort_order

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        field_type = ContactFieldType(d.pop("field_type"))

        label = d.pop("label")

        value = d.pop("value")

        id = UUID(d.pop("id"))

        contact_id = UUID(d.pop("contact_id"))

        is_primary = d.pop("is_primary", UNSET)

        sort_order = d.pop("sort_order", UNSET)

        contact_field_public = cls(
            field_type=field_type,
            label=label,
            value=value,
            id=id,
            contact_id=contact_id,
            is_primary=is_primary,
            sort_order=sort_order,
        )

        contact_field_public.additional_properties = d
        return contact_field_public

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
