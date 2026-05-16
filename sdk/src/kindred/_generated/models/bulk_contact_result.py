from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="BulkContactResult")


@_attrs_define
class BulkContactResult:
    """
    Attributes:
        updated_count (int):
        skipped_count (int):
        failed_ids (list[UUID] | Unset):
    """

    updated_count: int
    skipped_count: int
    failed_ids: list[UUID] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        updated_count = self.updated_count

        skipped_count = self.skipped_count

        failed_ids: list[str] | Unset = UNSET
        if not isinstance(self.failed_ids, Unset):
            failed_ids = []
            for failed_ids_item_data in self.failed_ids:
                failed_ids_item = str(failed_ids_item_data)
                failed_ids.append(failed_ids_item)

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "updated_count": updated_count,
                "skipped_count": skipped_count,
            }
        )
        if failed_ids is not UNSET:
            field_dict["failed_ids"] = failed_ids

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        updated_count = d.pop("updated_count")

        skipped_count = d.pop("skipped_count")

        _failed_ids = d.pop("failed_ids", UNSET)
        failed_ids: list[UUID] | Unset = UNSET
        if _failed_ids is not UNSET:
            failed_ids = []
            for failed_ids_item_data in _failed_ids:
                failed_ids_item = UUID(failed_ids_item_data)

                failed_ids.append(failed_ids_item)

        bulk_contact_result = cls(
            updated_count=updated_count,
            skipped_count=skipped_count,
            failed_ids=failed_ids,
        )

        bulk_contact_result.additional_properties = d
        return bulk_contact_result

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
