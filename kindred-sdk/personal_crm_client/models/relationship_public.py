from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast
from uuid import UUID






T = TypeVar("T", bound="RelationshipPublic")



@_attrs_define
class RelationshipPublic:
    """ 
        Attributes:
            relationship_type (str): Kind of relationship: spouse, child, parent, sibling, friend, colleague, etc.
            id (UUID):
            contact_id (UUID):
            related_contact_id (UUID):
            notes (None | str | Unset): Additional context about the relationship.
            inverse_id (None | Unset | UUID):
     """

    relationship_type: str
    id: UUID
    contact_id: UUID
    related_contact_id: UUID
    notes: None | str | Unset = UNSET
    inverse_id: None | Unset | UUID = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        relationship_type = self.relationship_type

        id = str(self.id)

        contact_id = str(self.contact_id)

        related_contact_id = str(self.related_contact_id)

        notes: None | str | Unset
        if isinstance(self.notes, Unset):
            notes = UNSET
        else:
            notes = self.notes

        inverse_id: None | str | Unset
        if isinstance(self.inverse_id, Unset):
            inverse_id = UNSET
        elif isinstance(self.inverse_id, UUID):
            inverse_id = str(self.inverse_id)
        else:
            inverse_id = self.inverse_id


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
            "relationship_type": relationship_type,
            "id": id,
            "contact_id": contact_id,
            "related_contact_id": related_contact_id,
        })
        if notes is not UNSET:
            field_dict["notes"] = notes
        if inverse_id is not UNSET:
            field_dict["inverse_id"] = inverse_id

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        relationship_type = d.pop("relationship_type")

        id = UUID(d.pop("id"))




        contact_id = UUID(d.pop("contact_id"))




        related_contact_id = UUID(d.pop("related_contact_id"))




        def _parse_notes(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        notes = _parse_notes(d.pop("notes", UNSET))


        def _parse_inverse_id(data: object) -> None | Unset | UUID:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                inverse_id_type_0 = UUID(data)



                return inverse_id_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | Unset | UUID, data)

        inverse_id = _parse_inverse_id(d.pop("inverse_id", UNSET))


        relationship_public = cls(
            relationship_type=relationship_type,
            id=id,
            contact_id=contact_id,
            related_contact_id=related_contact_id,
            notes=notes,
            inverse_id=inverse_id,
        )


        relationship_public.additional_properties = d
        return relationship_public

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
