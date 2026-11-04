from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from typing import cast

if TYPE_CHECKING:
    from ..models.json_export_response_contacts_item import JsonExportResponseContactsItem


T = TypeVar("T", bound="JsonExportResponse")


@_attrs_define
class JsonExportResponse:
    """JSON export of all contact rows (raw model_dump per contact).

    Attributes:
        contacts (list[JsonExportResponseContactsItem]):
    """

    contacts: list[JsonExportResponseContactsItem]
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.json_export_response_contacts_item import JsonExportResponseContactsItem

        contacts = []
        for contacts_item_data in self.contacts:
            contacts_item = contacts_item_data.to_dict()
            contacts.append(contacts_item)

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "contacts": contacts,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.json_export_response_contacts_item import JsonExportResponseContactsItem

        d = dict(src_dict)
        contacts = []
        _contacts = d.pop("contacts")
        for contacts_item_data in _contacts:
            contacts_item = JsonExportResponseContactsItem.from_dict(contacts_item_data)

            contacts.append(contacts_item)

        json_export_response = cls(
            contacts=contacts,
        )

        json_export_response.additional_properties = d
        return json_export_response

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
