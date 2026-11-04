from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from typing import cast

if TYPE_CHECKING:
    from ..models.contacts_public import ContactsPublic


T = TypeVar("T", bound="GetApiV1ContactsKanbanResponseGetApiV1ContactsKanban")


@_attrs_define
class GetApiV1ContactsKanbanResponseGetApiV1ContactsKanban:
    """ """

    additional_properties: dict[str, ContactsPublic] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.contacts_public import ContactsPublic

        field_dict: dict[str, Any] = {}
        for prop_name, prop in self.additional_properties.items():
            field_dict[prop_name] = prop.to_dict()

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.contacts_public import ContactsPublic

        d = dict(src_dict)
        get_api_v1_contacts_kanban_response_get_api_v1_contacts_kanban = cls()

        from ..models.contact_public import ContactPublic

        additional_properties = {}
        for prop_name, prop_dict in d.items():
            additional_property = ContactsPublic.from_dict(prop_dict)

            additional_properties[prop_name] = additional_property

        get_api_v1_contacts_kanban_response_get_api_v1_contacts_kanban.additional_properties = (
            additional_properties
        )
        return get_api_v1_contacts_kanban_response_get_api_v1_contacts_kanban

    @property
    def additional_keys(self) -> list[str]:
        return list(self.additional_properties.keys())

    def __getitem__(self, key: str) -> ContactsPublic:
        return self.additional_properties[key]

    def __setitem__(self, key: str, value: ContactsPublic) -> None:
        self.additional_properties[key] = value

    def __delitem__(self, key: str) -> None:
        del self.additional_properties[key]

    def __contains__(self, key: str) -> bool:
        return key in self.additional_properties
