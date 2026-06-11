from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast
from uuid import UUID
import datetime


T = TypeVar("T", bound="InverseRelationshipMapPublic")


@_attrs_define
class InverseRelationshipMapPublic:
    """
    Attributes:
        relationship_type (str): Forward relationship type (e.g. 'parent').
        inverse_type (str): Inverse relationship type (e.g. 'child').
        id (UUID):
        created_at (datetime.datetime):
        is_symmetric (bool | Unset): True when both sides use the same type (spouse<->spouse). Default: False.
    """

    relationship_type: str
    inverse_type: str
    id: UUID
    created_at: datetime.datetime
    is_symmetric: bool | Unset = False
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        relationship_type = self.relationship_type

        inverse_type = self.inverse_type

        id = str(self.id)

        created_at = self.created_at.isoformat()

        is_symmetric = self.is_symmetric

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "relationship_type": relationship_type,
                "inverse_type": inverse_type,
                "id": id,
                "created_at": created_at,
            }
        )
        if is_symmetric is not UNSET:
            field_dict["is_symmetric"] = is_symmetric

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        relationship_type = d.pop("relationship_type")

        inverse_type = d.pop("inverse_type")

        id = UUID(d.pop("id"))

        created_at = datetime.datetime.fromisoformat(d.pop("created_at"))

        is_symmetric = d.pop("is_symmetric", UNSET)

        inverse_relationship_map_public = cls(
            relationship_type=relationship_type,
            inverse_type=inverse_type,
            id=id,
            created_at=created_at,
            is_symmetric=is_symmetric,
        )

        inverse_relationship_map_public.additional_properties = d
        return inverse_relationship_map_public

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
