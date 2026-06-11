from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from typing import cast

if TYPE_CHECKING:
    from ..models.contact_geo_point import ContactGeoPoint


T = TypeVar("T", bound="ContactsGeoResponse")


@_attrs_define
class ContactsGeoResponse:
    """Response model for geo endpoint.

    Attributes:
        points (list[ContactGeoPoint]):
        count (int):
    """

    points: list[ContactGeoPoint]
    count: int
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.contact_geo_point import ContactGeoPoint

        points = []
        for points_item_data in self.points:
            points_item = points_item_data.to_dict()
            points.append(points_item)

        count = self.count

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "points": points,
                "count": count,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.contact_geo_point import ContactGeoPoint

        d = dict(src_dict)
        points = []
        _points = d.pop("points")
        for points_item_data in _points:
            points_item = ContactGeoPoint.from_dict(points_item_data)

            points.append(points_item)

        count = d.pop("count")

        contacts_geo_response = cls(
            points=points,
            count=count,
        )

        contacts_geo_response.additional_properties = d
        return contacts_geo_response

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
