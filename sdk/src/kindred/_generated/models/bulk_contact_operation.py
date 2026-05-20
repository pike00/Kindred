from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast
from uuid import UUID


T = TypeVar("T", bound="BulkContactOperation")


@_attrs_define
class BulkContactOperation:
    """
    Attributes:
        add_tag_ids (list[UUID] | None | Unset):
        remove_tag_ids (list[UUID] | None | Unset):
        set_is_archived (bool | None | Unset):
        set_is_favorite (bool | None | Unset):
    """

    add_tag_ids: list[UUID] | None | Unset = UNSET
    remove_tag_ids: list[UUID] | None | Unset = UNSET
    set_is_archived: bool | None | Unset = UNSET
    set_is_favorite: bool | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        add_tag_ids: list[str] | None | Unset
        if isinstance(self.add_tag_ids, Unset):
            add_tag_ids = UNSET
        elif isinstance(self.add_tag_ids, list):
            add_tag_ids = []
            for add_tag_ids_type_0_item_data in self.add_tag_ids:
                add_tag_ids_type_0_item = str(add_tag_ids_type_0_item_data)
                add_tag_ids.append(add_tag_ids_type_0_item)

        else:
            add_tag_ids = self.add_tag_ids

        remove_tag_ids: list[str] | None | Unset
        if isinstance(self.remove_tag_ids, Unset):
            remove_tag_ids = UNSET
        elif isinstance(self.remove_tag_ids, list):
            remove_tag_ids = []
            for remove_tag_ids_type_0_item_data in self.remove_tag_ids:
                remove_tag_ids_type_0_item = str(remove_tag_ids_type_0_item_data)
                remove_tag_ids.append(remove_tag_ids_type_0_item)

        else:
            remove_tag_ids = self.remove_tag_ids

        set_is_archived: bool | None | Unset
        if isinstance(self.set_is_archived, Unset):
            set_is_archived = UNSET
        else:
            set_is_archived = self.set_is_archived

        set_is_favorite: bool | None | Unset
        if isinstance(self.set_is_favorite, Unset):
            set_is_favorite = UNSET
        else:
            set_is_favorite = self.set_is_favorite

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if add_tag_ids is not UNSET:
            field_dict["add_tag_ids"] = add_tag_ids
        if remove_tag_ids is not UNSET:
            field_dict["remove_tag_ids"] = remove_tag_ids
        if set_is_archived is not UNSET:
            field_dict["set_is_archived"] = set_is_archived
        if set_is_favorite is not UNSET:
            field_dict["set_is_favorite"] = set_is_favorite

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)

        def _parse_add_tag_ids(data: object) -> list[UUID] | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, list):
                    raise TypeError()
                add_tag_ids_type_0 = []
                _add_tag_ids_type_0 = data
                for add_tag_ids_type_0_item_data in _add_tag_ids_type_0:
                    add_tag_ids_type_0_item = UUID(add_tag_ids_type_0_item_data)

                    add_tag_ids_type_0.append(add_tag_ids_type_0_item)

                return add_tag_ids_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(list[UUID] | None | Unset, data)

        add_tag_ids = _parse_add_tag_ids(d.pop("add_tag_ids", UNSET))

        def _parse_remove_tag_ids(data: object) -> list[UUID] | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, list):
                    raise TypeError()
                remove_tag_ids_type_0 = []
                _remove_tag_ids_type_0 = data
                for remove_tag_ids_type_0_item_data in _remove_tag_ids_type_0:
                    remove_tag_ids_type_0_item = UUID(remove_tag_ids_type_0_item_data)

                    remove_tag_ids_type_0.append(remove_tag_ids_type_0_item)

                return remove_tag_ids_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(list[UUID] | None | Unset, data)

        remove_tag_ids = _parse_remove_tag_ids(d.pop("remove_tag_ids", UNSET))

        def _parse_set_is_archived(data: object) -> bool | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(bool | None | Unset, data)

        set_is_archived = _parse_set_is_archived(d.pop("set_is_archived", UNSET))

        def _parse_set_is_favorite(data: object) -> bool | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(bool | None | Unset, data)

        set_is_favorite = _parse_set_is_favorite(d.pop("set_is_favorite", UNSET))

        bulk_contact_operation = cls(
            add_tag_ids=add_tag_ids,
            remove_tag_ids=remove_tag_ids,
            set_is_archived=set_is_archived,
            set_is_favorite=set_is_favorite,
        )

        bulk_contact_operation.additional_properties = d
        return bulk_contact_operation

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
