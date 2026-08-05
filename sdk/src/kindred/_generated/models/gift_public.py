from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.gift_status import GiftStatus
from ..types import UNSET, Unset
from typing import cast
from uuid import UUID
import datetime


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
        deleted_at (datetime.datetime | None | Unset):
        contact_birthday (datetime.date | None | Unset):
        contact_first_name (None | str | Unset):
        contact_last_name (None | str | Unset):
        days_until_occasion (int | None | Unset):
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
    deleted_at: datetime.datetime | None | Unset = UNSET
    contact_birthday: datetime.date | None | Unset = UNSET
    contact_first_name: None | str | Unset = UNSET
    contact_last_name: None | str | Unset = UNSET
    days_until_occasion: int | None | Unset = UNSET
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

        deleted_at: None | str | Unset
        if isinstance(self.deleted_at, Unset):
            deleted_at = UNSET
        elif isinstance(self.deleted_at, datetime.datetime):
            deleted_at = self.deleted_at.isoformat()
        else:
            deleted_at = self.deleted_at

        contact_birthday: None | str | Unset
        if isinstance(self.contact_birthday, Unset):
            contact_birthday = UNSET
        elif isinstance(self.contact_birthday, datetime.date):
            contact_birthday = self.contact_birthday.isoformat()
        else:
            contact_birthday = self.contact_birthday

        contact_first_name: None | str | Unset
        if isinstance(self.contact_first_name, Unset):
            contact_first_name = UNSET
        else:
            contact_first_name = self.contact_first_name

        contact_last_name: None | str | Unset
        if isinstance(self.contact_last_name, Unset):
            contact_last_name = UNSET
        else:
            contact_last_name = self.contact_last_name

        days_until_occasion: int | None | Unset
        if isinstance(self.days_until_occasion, Unset):
            days_until_occasion = UNSET
        else:
            days_until_occasion = self.days_until_occasion

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
        if deleted_at is not UNSET:
            field_dict["deleted_at"] = deleted_at
        if contact_birthday is not UNSET:
            field_dict["contact_birthday"] = contact_birthday
        if contact_first_name is not UNSET:
            field_dict["contact_first_name"] = contact_first_name
        if contact_last_name is not UNSET:
            field_dict["contact_last_name"] = contact_last_name
        if days_until_occasion is not UNSET:
            field_dict["days_until_occasion"] = days_until_occasion

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        name = d.pop("name")

        id = UUID(d.pop("id"))

        contact_id = UUID(d.pop("contact_id"))

        created_at = datetime.datetime.fromisoformat(d.pop("created_at"))

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
                gift_date_type_0 = datetime.date.fromisoformat(data)

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

        def _parse_deleted_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                deleted_at_type_0 = datetime.datetime.fromisoformat(data)

                return deleted_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        deleted_at = _parse_deleted_at(d.pop("deleted_at", UNSET))

        def _parse_contact_birthday(data: object) -> datetime.date | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                contact_birthday_type_0 = datetime.date.fromisoformat(data)

                return contact_birthday_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.date | None | Unset, data)

        contact_birthday = _parse_contact_birthday(d.pop("contact_birthday", UNSET))

        def _parse_contact_first_name(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        contact_first_name = _parse_contact_first_name(d.pop("contact_first_name", UNSET))

        def _parse_contact_last_name(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        contact_last_name = _parse_contact_last_name(d.pop("contact_last_name", UNSET))

        def _parse_days_until_occasion(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        days_until_occasion = _parse_days_until_occasion(d.pop("days_until_occasion", UNSET))

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
            deleted_at=deleted_at,
            contact_birthday=contact_birthday,
            contact_first_name=contact_first_name,
            contact_last_name=contact_last_name,
            days_until_occasion=days_until_occasion,
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
