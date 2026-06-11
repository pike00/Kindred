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


T = TypeVar("T", bound="OrganizationPublic")


@_attrs_define
class OrganizationPublic:
    """
    Attributes:
        name (str):
        id (UUID):
        owner_id (UUID):
        created_at (datetime.datetime):
        updated_at (datetime.datetime):
        domain (None | str | Unset):
        industry (None | str | Unset):
        notes (None | str | Unset):
        address_label (str | Unset):  Default: 'main'.
        address_street (None | str | Unset):
        address_extended (None | str | Unset):
        address_city (None | str | Unset):
        address_region (None | str | Unset):
        address_postal_code (None | str | Unset):
        address_country (None | str | Unset):
        address_latitude (float | None | Unset):
        address_longitude (float | None | Unset):
        contact_count (int | Unset):  Default: 0.
    """

    name: str
    id: UUID
    owner_id: UUID
    created_at: datetime.datetime
    updated_at: datetime.datetime
    domain: None | str | Unset = UNSET
    industry: None | str | Unset = UNSET
    notes: None | str | Unset = UNSET
    address_label: str | Unset = "main"
    address_street: None | str | Unset = UNSET
    address_extended: None | str | Unset = UNSET
    address_city: None | str | Unset = UNSET
    address_region: None | str | Unset = UNSET
    address_postal_code: None | str | Unset = UNSET
    address_country: None | str | Unset = UNSET
    address_latitude: float | None | Unset = UNSET
    address_longitude: float | None | Unset = UNSET
    contact_count: int | Unset = 0
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        name = self.name

        id = str(self.id)

        owner_id = str(self.owner_id)

        created_at = self.created_at.isoformat()

        updated_at = self.updated_at.isoformat()

        domain: None | str | Unset
        if isinstance(self.domain, Unset):
            domain = UNSET
        else:
            domain = self.domain

        industry: None | str | Unset
        if isinstance(self.industry, Unset):
            industry = UNSET
        else:
            industry = self.industry

        notes: None | str | Unset
        if isinstance(self.notes, Unset):
            notes = UNSET
        else:
            notes = self.notes

        address_label = self.address_label

        address_street: None | str | Unset
        if isinstance(self.address_street, Unset):
            address_street = UNSET
        else:
            address_street = self.address_street

        address_extended: None | str | Unset
        if isinstance(self.address_extended, Unset):
            address_extended = UNSET
        else:
            address_extended = self.address_extended

        address_city: None | str | Unset
        if isinstance(self.address_city, Unset):
            address_city = UNSET
        else:
            address_city = self.address_city

        address_region: None | str | Unset
        if isinstance(self.address_region, Unset):
            address_region = UNSET
        else:
            address_region = self.address_region

        address_postal_code: None | str | Unset
        if isinstance(self.address_postal_code, Unset):
            address_postal_code = UNSET
        else:
            address_postal_code = self.address_postal_code

        address_country: None | str | Unset
        if isinstance(self.address_country, Unset):
            address_country = UNSET
        else:
            address_country = self.address_country

        address_latitude: float | None | Unset
        if isinstance(self.address_latitude, Unset):
            address_latitude = UNSET
        else:
            address_latitude = self.address_latitude

        address_longitude: float | None | Unset
        if isinstance(self.address_longitude, Unset):
            address_longitude = UNSET
        else:
            address_longitude = self.address_longitude

        contact_count = self.contact_count

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "name": name,
                "id": id,
                "owner_id": owner_id,
                "created_at": created_at,
                "updated_at": updated_at,
            }
        )
        if domain is not UNSET:
            field_dict["domain"] = domain
        if industry is not UNSET:
            field_dict["industry"] = industry
        if notes is not UNSET:
            field_dict["notes"] = notes
        if address_label is not UNSET:
            field_dict["address_label"] = address_label
        if address_street is not UNSET:
            field_dict["address_street"] = address_street
        if address_extended is not UNSET:
            field_dict["address_extended"] = address_extended
        if address_city is not UNSET:
            field_dict["address_city"] = address_city
        if address_region is not UNSET:
            field_dict["address_region"] = address_region
        if address_postal_code is not UNSET:
            field_dict["address_postal_code"] = address_postal_code
        if address_country is not UNSET:
            field_dict["address_country"] = address_country
        if address_latitude is not UNSET:
            field_dict["address_latitude"] = address_latitude
        if address_longitude is not UNSET:
            field_dict["address_longitude"] = address_longitude
        if contact_count is not UNSET:
            field_dict["contact_count"] = contact_count

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        name = d.pop("name")

        id = UUID(d.pop("id"))

        owner_id = UUID(d.pop("owner_id"))

        created_at = datetime.datetime.fromisoformat(d.pop("created_at"))

        updated_at = datetime.datetime.fromisoformat(d.pop("updated_at"))

        def _parse_domain(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        domain = _parse_domain(d.pop("domain", UNSET))

        def _parse_industry(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        industry = _parse_industry(d.pop("industry", UNSET))

        def _parse_notes(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        notes = _parse_notes(d.pop("notes", UNSET))

        address_label = d.pop("address_label", UNSET)

        def _parse_address_street(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        address_street = _parse_address_street(d.pop("address_street", UNSET))

        def _parse_address_extended(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        address_extended = _parse_address_extended(d.pop("address_extended", UNSET))

        def _parse_address_city(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        address_city = _parse_address_city(d.pop("address_city", UNSET))

        def _parse_address_region(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        address_region = _parse_address_region(d.pop("address_region", UNSET))

        def _parse_address_postal_code(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        address_postal_code = _parse_address_postal_code(d.pop("address_postal_code", UNSET))

        def _parse_address_country(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        address_country = _parse_address_country(d.pop("address_country", UNSET))

        def _parse_address_latitude(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        address_latitude = _parse_address_latitude(d.pop("address_latitude", UNSET))

        def _parse_address_longitude(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        address_longitude = _parse_address_longitude(d.pop("address_longitude", UNSET))

        contact_count = d.pop("contact_count", UNSET)

        organization_public = cls(
            name=name,
            id=id,
            owner_id=owner_id,
            created_at=created_at,
            updated_at=updated_at,
            domain=domain,
            industry=industry,
            notes=notes,
            address_label=address_label,
            address_street=address_street,
            address_extended=address_extended,
            address_city=address_city,
            address_region=address_region,
            address_postal_code=address_postal_code,
            address_country=address_country,
            address_latitude=address_latitude,
            address_longitude=address_longitude,
            contact_count=contact_count,
        )

        organization_public.additional_properties = d
        return organization_public

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
