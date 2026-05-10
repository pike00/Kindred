from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="AddressCreate")


@_attrs_define
class AddressCreate:
    """
    Attributes:
        contact_id (UUID):
        label (str | Unset): Label like "home", "work", "other". Default: 'home'.
        street (None | str | Unset): Street line 1.
        extended (None | str | Unset): Apartment, suite, floor, etc.
        city (None | str | Unset): City.
        region (None | str | Unset): State, province, or region.
        postal_code (None | str | Unset): ZIP or postal code.
        country (None | str | Unset): Country.
        latitude (float | None | Unset): Geocoded latitude; used for map visualization.
        longitude (float | None | Unset): Geocoded longitude; used for map visualization.
    """

    contact_id: UUID
    label: str | Unset = "home"
    street: None | str | Unset = UNSET
    extended: None | str | Unset = UNSET
    city: None | str | Unset = UNSET
    region: None | str | Unset = UNSET
    postal_code: None | str | Unset = UNSET
    country: None | str | Unset = UNSET
    latitude: float | None | Unset = UNSET
    longitude: float | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        contact_id = str(self.contact_id)

        label = self.label

        street: None | str | Unset
        if isinstance(self.street, Unset):
            street = UNSET
        else:
            street = self.street

        extended: None | str | Unset
        if isinstance(self.extended, Unset):
            extended = UNSET
        else:
            extended = self.extended

        city: None | str | Unset
        if isinstance(self.city, Unset):
            city = UNSET
        else:
            city = self.city

        region: None | str | Unset
        if isinstance(self.region, Unset):
            region = UNSET
        else:
            region = self.region

        postal_code: None | str | Unset
        if isinstance(self.postal_code, Unset):
            postal_code = UNSET
        else:
            postal_code = self.postal_code

        country: None | str | Unset
        if isinstance(self.country, Unset):
            country = UNSET
        else:
            country = self.country

        latitude: float | None | Unset
        if isinstance(self.latitude, Unset):
            latitude = UNSET
        else:
            latitude = self.latitude

        longitude: float | None | Unset
        if isinstance(self.longitude, Unset):
            longitude = UNSET
        else:
            longitude = self.longitude

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "contact_id": contact_id,
            }
        )
        if label is not UNSET:
            field_dict["label"] = label
        if street is not UNSET:
            field_dict["street"] = street
        if extended is not UNSET:
            field_dict["extended"] = extended
        if city is not UNSET:
            field_dict["city"] = city
        if region is not UNSET:
            field_dict["region"] = region
        if postal_code is not UNSET:
            field_dict["postal_code"] = postal_code
        if country is not UNSET:
            field_dict["country"] = country
        if latitude is not UNSET:
            field_dict["latitude"] = latitude
        if longitude is not UNSET:
            field_dict["longitude"] = longitude

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        contact_id = UUID(d.pop("contact_id"))

        label = d.pop("label", UNSET)

        def _parse_street(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        street = _parse_street(d.pop("street", UNSET))

        def _parse_extended(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        extended = _parse_extended(d.pop("extended", UNSET))

        def _parse_city(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        city = _parse_city(d.pop("city", UNSET))

        def _parse_region(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        region = _parse_region(d.pop("region", UNSET))

        def _parse_postal_code(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        postal_code = _parse_postal_code(d.pop("postal_code", UNSET))

        def _parse_country(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        country = _parse_country(d.pop("country", UNSET))

        def _parse_latitude(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        latitude = _parse_latitude(d.pop("latitude", UNSET))

        def _parse_longitude(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        longitude = _parse_longitude(d.pop("longitude", UNSET))

        address_create = cls(
            contact_id=contact_id,
            label=label,
            street=street,
            extended=extended,
            city=city,
            region=region,
            postal_code=postal_code,
            country=country,
            latitude=latitude,
            longitude=longitude,
        )

        address_create.additional_properties = d
        return address_create

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
