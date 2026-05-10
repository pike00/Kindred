from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

from ..models.gift_status import GiftStatus
from ..types import UNSET, Unset

T = TypeVar("T", bound="GiftPublic")


@_attrs_define
class GiftPublic:
    """
    Attributes:
        name (str): Gift name.
        id (UUID):
        contact_id (UUID):
        created_at (datetime.datetime):
        description (None | str | Unset): Details about the gift.
        status (GiftStatus | Unset):
        occasion (None | str | Unset): Occasion like Birthday, Christmas, Housewarming.
        gift_date (datetime.date | None | Unset): When the gift was given or received.
        value_amount (float | None | Unset): Monetary cost or value.
        value_currency (str | Unset): ISO 4217 currency code. Default: 'USD'.
        url (None | str | Unset): Link to the product page (e.g. Amazon).
    """

    name: str
    id: UUID
    contact_id: UUID
    created_at: datetime.datetime
    description: None | str | Unset = UNSET
    status: GiftStatus | Unset = UNSET
    occasion: None | str | Unset = UNSET
    gift_date: datetime.date | None | Unset = UNSET
    value_amount: float | None | Unset = UNSET
    value_currency: str | Unset = "USD"
    url: None | str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        name = self.name

        id = str(self.id)

        contact_id = str(self.contact_id)

        created_at = self.created_at.isoformat()

        description: None | str | Unset
        if isinstance(self.description, Unset):
            description = UNSET
        else:
            description = self.description

        status: str | Unset = UNSET
        if not isinstance(self.status, Unset):
            status = self.status.value

        occasion: None | str | Unset
        if isinstance(self.occasion, Unset):
            occasion = UNSET
        else:
            occasion = self.occasion

        gift_date: None | str | Unset
        if isinstance(self.gift_date, Unset):
            gift_date = UNSET
        elif isinstance(self.gift_date, datetime.date):
            gift_date = self.gift_date.isoformat()
        else:
            gift_date = self.gift_date

        value_amount: float | None | Unset
        if isinstance(self.value_amount, Unset):
            value_amount = UNSET
        else:
            value_amount = self.value_amount

        value_currency = self.value_currency

        url: None | str | Unset
        if isinstance(self.url, Unset):
            url = UNSET
        else:
            url = self.url

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "name": name,
                "id": id,
                "contact_id": contact_id,
                "created_at": created_at,
            }
        )
        if description is not UNSET:
            field_dict["description"] = description
        if status is not UNSET:
            field_dict["status"] = status
        if occasion is not UNSET:
            field_dict["occasion"] = occasion
        if gift_date is not UNSET:
            field_dict["gift_date"] = gift_date
        if value_amount is not UNSET:
            field_dict["value_amount"] = value_amount
        if value_currency is not UNSET:
            field_dict["value_currency"] = value_currency
        if url is not UNSET:
            field_dict["url"] = url

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        name = d.pop("name")

        id = UUID(d.pop("id"))

        contact_id = UUID(d.pop("contact_id"))

        created_at = isoparse(d.pop("created_at"))

        def _parse_description(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        description = _parse_description(d.pop("description", UNSET))

        _status = d.pop("status", UNSET)
        status: GiftStatus | Unset
        if isinstance(_status, Unset):
            status = UNSET
        else:
            status = GiftStatus(_status)

        def _parse_occasion(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        occasion = _parse_occasion(d.pop("occasion", UNSET))

        def _parse_gift_date(data: object) -> datetime.date | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                gift_date_type_0 = isoparse(data).date()

                return gift_date_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.date | None | Unset, data)

        gift_date = _parse_gift_date(d.pop("gift_date", UNSET))

        def _parse_value_amount(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        value_amount = _parse_value_amount(d.pop("value_amount", UNSET))

        value_currency = d.pop("value_currency", UNSET)

        def _parse_url(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        url = _parse_url(d.pop("url", UNSET))

        gift_public = cls(
            name=name,
            id=id,
            contact_id=contact_id,
            created_at=created_at,
            description=description,
            status=status,
            occasion=occasion,
            gift_date=gift_date,
            value_amount=value_amount,
            value_currency=value_currency,
            url=url,
        )

        gift_public.additional_properties = d
        return gift_public

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
