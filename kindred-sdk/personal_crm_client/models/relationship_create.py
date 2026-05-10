from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="RelationshipCreate")


@_attrs_define
class RelationshipCreate:
    """
    Attributes:
        relationship_type (str): Kind of relationship: spouse, child, parent, sibling, friend, colleague, etc.
        contact_id (UUID):
        related_contact_id (UUID):
        notes (None | str | Unset): Additional context about the relationship.
        inverse_relationship_type (None | str | Unset): Type for the auto-generated inverse row. If omitted, the server
            infers it from a known map of symmetric/asymmetric types and returns 422 when it cannot.
    """

    relationship_type: str
    contact_id: UUID
    related_contact_id: UUID
    notes: None | str | Unset = UNSET
    inverse_relationship_type: None | str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        relationship_type = self.relationship_type

        contact_id = str(self.contact_id)

        related_contact_id = str(self.related_contact_id)

        notes: None | str | Unset
        if isinstance(self.notes, Unset):
            notes = UNSET
        else:
            notes = self.notes

        inverse_relationship_type: None | str | Unset
        if isinstance(self.inverse_relationship_type, Unset):
            inverse_relationship_type = UNSET
        else:
            inverse_relationship_type = self.inverse_relationship_type

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "relationship_type": relationship_type,
                "contact_id": contact_id,
                "related_contact_id": related_contact_id,
            }
        )
        if notes is not UNSET:
            field_dict["notes"] = notes
        if inverse_relationship_type is not UNSET:
            field_dict["inverse_relationship_type"] = inverse_relationship_type

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        relationship_type = d.pop("relationship_type")

        contact_id = UUID(d.pop("contact_id"))

        related_contact_id = UUID(d.pop("related_contact_id"))

        def _parse_notes(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        notes = _parse_notes(d.pop("notes", UNSET))

        def _parse_inverse_relationship_type(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        inverse_relationship_type = _parse_inverse_relationship_type(d.pop("inverse_relationship_type", UNSET))

        relationship_create = cls(
            relationship_type=relationship_type,
            contact_id=contact_id,
            related_contact_id=related_contact_id,
            notes=notes,
            inverse_relationship_type=inverse_relationship_type,
        )

        relationship_create.additional_properties = d
        return relationship_create

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
