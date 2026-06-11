from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast
from uuid import UUID

if TYPE_CHECKING:
    from ..models.saved_filter_update_filter_json_type_0 import SavedFilterUpdateFilterJsonType0


T = TypeVar("T", bound="SavedFilterUpdate")


@_attrs_define
class SavedFilterUpdate:
    """
    Attributes:
        name (None | str | Unset):
        filter_json (None | SavedFilterUpdateFilterJsonType0 | Unset):
        tag_id (None | Unset | UUID):
    """

    name: None | str | Unset = UNSET
    filter_json: None | SavedFilterUpdateFilterJsonType0 | Unset = UNSET
    tag_id: None | Unset | UUID = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.saved_filter_update_filter_json_type_0 import SavedFilterUpdateFilterJsonType0

        name: None | str | Unset
        if isinstance(self.name, Unset):
            name = UNSET
        else:
            name = self.name

        filter_json: dict[str, Any] | None | Unset
        if isinstance(self.filter_json, Unset):
            filter_json = UNSET
        elif isinstance(self.filter_json, SavedFilterUpdateFilterJsonType0):
            filter_json = self.filter_json.to_dict()
        else:
            filter_json = self.filter_json

        tag_id: None | str | Unset
        if isinstance(self.tag_id, Unset):
            tag_id = UNSET
        elif isinstance(self.tag_id, UUID):
            tag_id = str(self.tag_id)
        else:
            tag_id = self.tag_id

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if name is not UNSET:
            field_dict["name"] = name
        if filter_json is not UNSET:
            field_dict["filter_json"] = filter_json
        if tag_id is not UNSET:
            field_dict["tag_id"] = tag_id

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.saved_filter_update_filter_json_type_0 import SavedFilterUpdateFilterJsonType0

        d = dict(src_dict)

        def _parse_name(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        name = _parse_name(d.pop("name", UNSET))

        def _parse_filter_json(data: object) -> None | SavedFilterUpdateFilterJsonType0 | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                filter_json_type_0 = SavedFilterUpdateFilterJsonType0.from_dict(data)

                return filter_json_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | SavedFilterUpdateFilterJsonType0 | Unset, data)

        filter_json = _parse_filter_json(d.pop("filter_json", UNSET))

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

        saved_filter_update = cls(
            name=name,
            filter_json=filter_json,
            tag_id=tag_id,
        )

        saved_filter_update.additional_properties = d
        return saved_filter_update

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
