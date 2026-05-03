from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from typing import cast






T = TypeVar("T", bound="RelationshipsLookupInverseResponseRelationshipsLookupInverse")



@_attrs_define
class RelationshipsLookupInverseResponseRelationshipsLookupInverse:
    """ 
     """

    additional_properties: dict[str, None | str] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        
        field_dict: dict[str, Any] = {}
        for prop_name, prop in self.additional_properties.items():
            
            field_dict[prop_name] = prop


        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        relationships_lookup_inverse_response_relationships_lookup_inverse = cls(
        )


        additional_properties = {}
        for prop_name, prop_dict in d.items():
            def _parse_additional_property(data: object) -> None | str:
                if data is None:
                    return data
                return cast(None | str, data)

            additional_property = _parse_additional_property(prop_dict)

            additional_properties[prop_name] = additional_property

        relationships_lookup_inverse_response_relationships_lookup_inverse.additional_properties = additional_properties
        return relationships_lookup_inverse_response_relationships_lookup_inverse

    @property
    def additional_keys(self) -> list[str]:
        return list(self.additional_properties.keys())

    def __getitem__(self, key: str) -> None | str:
        return self.additional_properties[key]

    def __setitem__(self, key: str, value: None | str) -> None:
        self.additional_properties[key] = value

    def __delitem__(self, key: str) -> None:
        del self.additional_properties[key]

    def __contains__(self, key: str) -> bool:
        return key in self.additional_properties
