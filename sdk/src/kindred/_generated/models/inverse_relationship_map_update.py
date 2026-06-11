from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast


T = TypeVar("T", bound="InverseRelationshipMapUpdate")


@_attrs_define
class InverseRelationshipMapUpdate:
    """Update schema - all fields optional.

    Attributes:
        inverse_type (None | str | Unset):
        is_symmetric (bool | None | Unset):
    """

    inverse_type: None | str | Unset = UNSET
    is_symmetric: bool | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        inverse_type: None | str | Unset
        if isinstance(self.inverse_type, Unset):
            inverse_type = UNSET
        else:
            inverse_type = self.inverse_type

        is_symmetric: bool | None | Unset
        if isinstance(self.is_symmetric, Unset):
            is_symmetric = UNSET
        else:
            is_symmetric = self.is_symmetric

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if inverse_type is not UNSET:
            field_dict["inverse_type"] = inverse_type
        if is_symmetric is not UNSET:
            field_dict["is_symmetric"] = is_symmetric

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)

        def _parse_inverse_type(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        inverse_type = _parse_inverse_type(d.pop("inverse_type", UNSET))

        def _parse_is_symmetric(data: object) -> bool | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(bool | None | Unset, data)

        is_symmetric = _parse_is_symmetric(d.pop("is_symmetric", UNSET))

        inverse_relationship_map_update = cls(
            inverse_type=inverse_type,
            is_symmetric=is_symmetric,
        )

        inverse_relationship_map_update.additional_properties = d
        return inverse_relationship_map_update

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
