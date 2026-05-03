from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.gift_status import GiftStatus
from ..types import UNSET, Unset
from dateutil.parser import isoparse
from typing import cast
import datetime






T = TypeVar("T", bound="GiftUpdate")



@_attrs_define
class GiftUpdate:
    """ 
        Attributes:
            name (None | str | Unset):
            description (None | str | Unset):
            status (GiftStatus | None | Unset):
            occasion (None | str | Unset):
            gift_date (datetime.date | None | Unset):
            value_amount (float | None | Unset):
            value_currency (None | str | Unset):
            url (None | str | Unset):
     """

    name: None | str | Unset = UNSET
    description: None | str | Unset = UNSET
    status: GiftStatus | None | Unset = UNSET
    occasion: None | str | Unset = UNSET
    gift_date: datetime.date | None | Unset = UNSET
    value_amount: float | None | Unset = UNSET
    value_currency: None | str | Unset = UNSET
    url: None | str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        name: None | str | Unset
        if isinstance(self.name, Unset):
            name = UNSET
        else:
            name = self.name

        description: None | str | Unset
        if isinstance(self.description, Unset):
            description = UNSET
        else:
            description = self.description

        status: None | str | Unset
        if isinstance(self.status, Unset):
            status = UNSET
        elif isinstance(self.status, GiftStatus):
            status = self.status.value
        else:
            status = self.status

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

        value_currency: None | str | Unset
        if isinstance(self.value_currency, Unset):
            value_currency = UNSET
        else:
            value_currency = self.value_currency

        url: None | str | Unset
        if isinstance(self.url, Unset):
            url = UNSET
        else:
            url = self.url


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
        })
        if name is not UNSET:
            field_dict["name"] = name
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
        def _parse_name(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        name = _parse_name(d.pop("name", UNSET))


        def _parse_description(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        description = _parse_description(d.pop("description", UNSET))


        def _parse_status(data: object) -> GiftStatus | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                status_type_0 = GiftStatus(data)



                return status_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(GiftStatus | None | Unset, data)

        status = _parse_status(d.pop("status", UNSET))


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


        def _parse_value_currency(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        value_currency = _parse_value_currency(d.pop("value_currency", UNSET))


        def _parse_url(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        url = _parse_url(d.pop("url", UNSET))


        gift_update = cls(
            name=name,
            description=description,
            status=status,
            occasion=occasion,
            gift_date=gift_date,
            value_amount=value_amount,
            value_currency=value_currency,
            url=url,
        )


        gift_update.additional_properties = d
        return gift_update

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
