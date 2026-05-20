from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast


T = TypeVar("T", bound="IMessageSyncResult")


@_attrs_define
class IMessageSyncResult:
    """Result of iMessage sync operation.

    Attributes:
        created_count (int | Unset):  Default: 0.
        updated_count (int | Unset):  Default: 0.
        skipped_count (int | Unset):  Default: 0.
        failed_ids (list[str] | Unset):
    """

    created_count: int | Unset = 0
    updated_count: int | Unset = 0
    skipped_count: int | Unset = 0
    failed_ids: list[str] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        created_count = self.created_count

        updated_count = self.updated_count

        skipped_count = self.skipped_count

        failed_ids: list[str] | Unset = UNSET
        if not isinstance(self.failed_ids, Unset):
            failed_ids = self.failed_ids

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if created_count is not UNSET:
            field_dict["created_count"] = created_count
        if updated_count is not UNSET:
            field_dict["updated_count"] = updated_count
        if skipped_count is not UNSET:
            field_dict["skipped_count"] = skipped_count
        if failed_ids is not UNSET:
            field_dict["failed_ids"] = failed_ids

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        created_count = d.pop("created_count", UNSET)

        updated_count = d.pop("updated_count", UNSET)

        skipped_count = d.pop("skipped_count", UNSET)

        failed_ids = cast(list[str], d.pop("failed_ids", UNSET))

        i_message_sync_result = cls(
            created_count=created_count,
            updated_count=updated_count,
            skipped_count=skipped_count,
            failed_ids=failed_ids,
        )

        i_message_sync_result.additional_properties = d
        return i_message_sync_result

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
