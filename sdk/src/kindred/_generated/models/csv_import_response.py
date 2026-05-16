from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="CSVImportResponse")


@_attrs_define
class CSVImportResponse:
    """Response for CSV import.

    Attributes:
        imported (int):
        skipped (int):
        updated (int):
        errors (list[str]):
        tag_names_created (list[str] | Unset):
    """

    imported: int
    skipped: int
    updated: int
    errors: list[str]
    tag_names_created: list[str] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        imported = self.imported

        skipped = self.skipped

        updated = self.updated

        errors = self.errors

        tag_names_created: list[str] | Unset = UNSET
        if not isinstance(self.tag_names_created, Unset):
            tag_names_created = self.tag_names_created

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "imported": imported,
                "skipped": skipped,
                "updated": updated,
                "errors": errors,
            }
        )
        if tag_names_created is not UNSET:
            field_dict["tag_names_created"] = tag_names_created

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        imported = d.pop("imported")

        skipped = d.pop("skipped")

        updated = d.pop("updated")

        errors = cast(list[str], d.pop("errors"))

        tag_names_created = cast(list[str], d.pop("tag_names_created", UNSET))

        csv_import_response = cls(
            imported=imported,
            skipped=skipped,
            updated=updated,
            errors=errors,
            tag_names_created=tag_names_created,
        )

        csv_import_response.additional_properties = d
        return csv_import_response

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
