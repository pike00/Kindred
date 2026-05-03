from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast
from uuid import UUID






T = TypeVar("T", bound="PetCreate")



@_attrs_define
class PetCreate:
    """ 
        Attributes:
            name (str): Pet's name.
            contact_id (UUID):
            species (None | str | Unset): Species like dog, cat, bird.
            breed (None | str | Unset): Breed, if known.
            notes (None | str | Unset): Freeform notes (e.g. allergies, birthday).
     """

    name: str
    contact_id: UUID
    species: None | str | Unset = UNSET
    breed: None | str | Unset = UNSET
    notes: None | str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        name = self.name

        contact_id = str(self.contact_id)

        species: None | str | Unset
        if isinstance(self.species, Unset):
            species = UNSET
        else:
            species = self.species

        breed: None | str | Unset
        if isinstance(self.breed, Unset):
            breed = UNSET
        else:
            breed = self.breed

        notes: None | str | Unset
        if isinstance(self.notes, Unset):
            notes = UNSET
        else:
            notes = self.notes


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
            "name": name,
            "contact_id": contact_id,
        })
        if species is not UNSET:
            field_dict["species"] = species
        if breed is not UNSET:
            field_dict["breed"] = breed
        if notes is not UNSET:
            field_dict["notes"] = notes

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        name = d.pop("name")

        contact_id = UUID(d.pop("contact_id"))




        def _parse_species(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        species = _parse_species(d.pop("species", UNSET))


        def _parse_breed(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        breed = _parse_breed(d.pop("breed", UNSET))


        def _parse_notes(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        notes = _parse_notes(d.pop("notes", UNSET))


        pet_create = cls(
            name=name,
            contact_id=contact_id,
            species=species,
            breed=breed,
            notes=notes,
        )


        pet_create.additional_properties = d
        return pet_create

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
