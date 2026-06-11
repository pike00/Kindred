from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast
from uuid import UUID


T = TypeVar("T", bound="ContactGeoPoint")


@_attrs_define
class ContactGeoPoint:
    """A geo point representing a contact's address.

    Attributes:
        contact_id (UUID):
        contact_name (str):
        latitude (float):
        longitude (float):
        address_label (str):
        avatar_url (None | str | Unset):
        city (None | str | Unset):
        country (None | str | Unset):
        street (None | str | Unset):
    """

    contact_id: UUID
    contact_name: str
    latitude: float
    longitude: float
    address_label: str
    avatar_url: None | str | Unset = UNSET
    city: None | str | Unset = UNSET
    country: None | str | Unset = UNSET
    street: None | str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        contact_id = str(self.contact_id)

        contact_name = self.contact_name

        latitude = self.latitude

        longitude = self.longitude

        address_label = self.address_label

        avatar_url: None | str | Unset
        if isinstance(self.avatar_url, Unset):
            avatar_url = UNSET
        else:
            avatar_url = self.avatar_url

        city: None | str | Unset
        if isinstance(self.city, Unset):
            city = UNSET
        else:
            city = self.city

        country: None | str | Unset
        if isinstance(self.country, Unset):
            country = UNSET
        else:
            country = self.country

        street: None | str | Unset
        if isinstance(self.street, Unset):
            street = UNSET
        else:
            street = self.street

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "contact_id": contact_id,
                "contact_name": contact_name,
                "latitude": latitude,
                "longitude": longitude,
                "address_label": address_label,
            }
        )
        if avatar_url is not UNSET:
            field_dict["avatar_url"] = avatar_url
        if city is not UNSET:
            field_dict["city"] = city
        if country is not UNSET:
            field_dict["country"] = country
        if street is not UNSET:
            field_dict["street"] = street

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        contact_id = UUID(d.pop("contact_id"))

        contact_name = d.pop("contact_name")

        latitude = d.pop("latitude")

        longitude = d.pop("longitude")

        address_label = d.pop("address_label")

        def _parse_avatar_url(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        avatar_url = _parse_avatar_url(d.pop("avatar_url", UNSET))

        def _parse_city(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        city = _parse_city(d.pop("city", UNSET))

        def _parse_country(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        country = _parse_country(d.pop("country", UNSET))

        def _parse_street(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        street = _parse_street(d.pop("street", UNSET))

        contact_geo_point = cls(
            contact_id=contact_id,
            contact_name=contact_name,
            latitude=latitude,
            longitude=longitude,
            address_label=address_label,
            avatar_url=avatar_url,
            city=city,
            country=country,
            street=street,
        )

        contact_geo_point.additional_properties = d
        return contact_geo_point

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
