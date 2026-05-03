from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.debt_direction import DebtDirection
from ..types import UNSET, Unset
from dateutil.parser import isoparse
from typing import cast
import datetime






T = TypeVar("T", bound="DebtUpdate")



@_attrs_define
class DebtUpdate:
    """ 
        Attributes:
            direction (DebtDirection | None | Unset):
            amount (float | None | Unset):
            currency (None | str | Unset):
            reason (None | str | Unset):
            is_settled (bool | None | Unset):
            settled_at (datetime.date | None | Unset):
     """

    direction: DebtDirection | None | Unset = UNSET
    amount: float | None | Unset = UNSET
    currency: None | str | Unset = UNSET
    reason: None | str | Unset = UNSET
    is_settled: bool | None | Unset = UNSET
    settled_at: datetime.date | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        direction: None | str | Unset
        if isinstance(self.direction, Unset):
            direction = UNSET
        elif isinstance(self.direction, DebtDirection):
            direction = self.direction.value
        else:
            direction = self.direction

        amount: float | None | Unset
        if isinstance(self.amount, Unset):
            amount = UNSET
        else:
            amount = self.amount

        currency: None | str | Unset
        if isinstance(self.currency, Unset):
            currency = UNSET
        else:
            currency = self.currency

        reason: None | str | Unset
        if isinstance(self.reason, Unset):
            reason = UNSET
        else:
            reason = self.reason

        is_settled: bool | None | Unset
        if isinstance(self.is_settled, Unset):
            is_settled = UNSET
        else:
            is_settled = self.is_settled

        settled_at: None | str | Unset
        if isinstance(self.settled_at, Unset):
            settled_at = UNSET
        elif isinstance(self.settled_at, datetime.date):
            settled_at = self.settled_at.isoformat()
        else:
            settled_at = self.settled_at


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
        })
        if direction is not UNSET:
            field_dict["direction"] = direction
        if amount is not UNSET:
            field_dict["amount"] = amount
        if currency is not UNSET:
            field_dict["currency"] = currency
        if reason is not UNSET:
            field_dict["reason"] = reason
        if is_settled is not UNSET:
            field_dict["is_settled"] = is_settled
        if settled_at is not UNSET:
            field_dict["settled_at"] = settled_at

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        def _parse_direction(data: object) -> DebtDirection | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                direction_type_0 = DebtDirection(data)



                return direction_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(DebtDirection | None | Unset, data)

        direction = _parse_direction(d.pop("direction", UNSET))


        def _parse_amount(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        amount = _parse_amount(d.pop("amount", UNSET))


        def _parse_currency(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        currency = _parse_currency(d.pop("currency", UNSET))


        def _parse_reason(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        reason = _parse_reason(d.pop("reason", UNSET))


        def _parse_is_settled(data: object) -> bool | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(bool | None | Unset, data)

        is_settled = _parse_is_settled(d.pop("is_settled", UNSET))


        def _parse_settled_at(data: object) -> datetime.date | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                settled_at_type_0 = isoparse(data).date()



                return settled_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.date | None | Unset, data)

        settled_at = _parse_settled_at(d.pop("settled_at", UNSET))


        debt_update = cls(
            direction=direction,
            amount=amount,
            currency=currency,
            reason=reason,
            is_settled=is_settled,
            settled_at=settled_at,
        )


        debt_update.additional_properties = d
        return debt_update

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
