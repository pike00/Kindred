from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset


T = TypeVar("T", bound="BulkUpdateResponse")


@_attrs_define
class BulkUpdateResponse:
    """
    Attributes:
        updated_count (int):
        skipped_count (int | Unset):  Default: 0.
    """

    updated_count: int
    skipped_count: int | Unset = 0
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        updated_count = self.updated_count

        skipped_count = self.skipped_count

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "updated_count": updated_count,
            }
        )
        if skipped_count is not UNSET:
            field_dict["skipped_count"] = skipped_count

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        updated_count = d.pop("updated_count")

        skipped_count = d.pop("skipped_count", UNSET)

        bulk_update_response = cls(
            updated_count=updated_count,
            skipped_count=skipped_count,
        )

        bulk_update_response.additional_properties = d
        return bulk_update_response

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
