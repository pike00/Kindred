from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast
from uuid import UUID


T = TypeVar("T", bound="BulkContactFilter")


@_attrs_define
class BulkContactFilter:
    """
    Attributes:
        search (None | str | Unset):
        tag_id (None | Unset | UUID):
        is_favorite (bool | None | Unset):
        is_archived (bool | None | Unset):
        stage (None | str | Unset):
    """

    search: None | str | Unset = UNSET
    tag_id: None | Unset | UUID = UNSET
    is_favorite: bool | None | Unset = UNSET
    is_archived: bool | None | Unset = UNSET
    stage: None | str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        search: None | str | Unset
        if isinstance(self.search, Unset):
            search = UNSET
        else:
            search = self.search

        tag_id: None | str | Unset
        if isinstance(self.tag_id, Unset):
            tag_id = UNSET
        elif isinstance(self.tag_id, UUID):
            tag_id = str(self.tag_id)
        else:
            tag_id = self.tag_id

        is_favorite: bool | None | Unset
        if isinstance(self.is_favorite, Unset):
            is_favorite = UNSET
        else:
            is_favorite = self.is_favorite

        is_archived: bool | None | Unset
        if isinstance(self.is_archived, Unset):
            is_archived = UNSET
        else:
            is_archived = self.is_archived

        stage: None | str | Unset
        if isinstance(self.stage, Unset):
            stage = UNSET
        else:
            stage = self.stage

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if search is not UNSET:
            field_dict["search"] = search
        if tag_id is not UNSET:
            field_dict["tag_id"] = tag_id
        if is_favorite is not UNSET:
            field_dict["is_favorite"] = is_favorite
        if is_archived is not UNSET:
            field_dict["is_archived"] = is_archived
        if stage is not UNSET:
            field_dict["stage"] = stage

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)

        def _parse_search(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        search = _parse_search(d.pop("search", UNSET))

        def _parse_tag_id(data: object) -> None | Unset | UUID:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                tag_id_type_0 = UUID(data)

                return tag_id_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | Unset | UUID, data)

        tag_id = _parse_tag_id(d.pop("tag_id", UNSET))

        def _parse_is_favorite(data: object) -> bool | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(bool | None | Unset, data)

        is_favorite = _parse_is_favorite(d.pop("is_favorite", UNSET))

        def _parse_is_archived(data: object) -> bool | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(bool | None | Unset, data)

        is_archived = _parse_is_archived(d.pop("is_archived", UNSET))

        def _parse_stage(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        stage = _parse_stage(d.pop("stage", UNSET))

        bulk_contact_filter = cls(
            search=search,
            tag_id=tag_id,
            is_favorite=is_favorite,
            is_archived=is_archived,
            stage=stage,
        )

        bulk_contact_filter.additional_properties = d
        return bulk_contact_filter

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
