from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

from ..models.debt_direction import DebtDirection
from ..types import UNSET, Unset

T = TypeVar("T", bound="DebtPublic")


@_attrs_define
class DebtPublic:
    """
    Attributes:
        direction (DebtDirection):
        amount (float): Amount owed; must be greater than zero.
        id (UUID):
        contact_id (UUID):
        created_at (datetime.datetime):
        currency (str | Unset): ISO 4217 currency code. Default: 'USD'.
        reason (None | str | Unset): What the debt is for.
        is_settled (bool | Unset): Marked paid off. Default: False.
        settled_at (datetime.date | None | Unset): Date the debt was settled.
        deleted_at (datetime.datetime | None | Unset):
    """

    direction: DebtDirection
    amount: float
    id: UUID
    contact_id: UUID
    created_at: datetime.datetime
    currency: str | Unset = "USD"
    reason: None | str | Unset = UNSET
    is_settled: bool | Unset = False
    settled_at: datetime.date | None | Unset = UNSET
    deleted_at: datetime.datetime | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        direction = self.direction.value

        amount = self.amount

        id = str(self.id)

        contact_id = str(self.contact_id)

        created_at = self.created_at.isoformat()

        currency = self.currency

        reason: None | str | Unset
        if isinstance(self.reason, Unset):
            reason = UNSET
        else:
            reason = self.reason

        is_settled = self.is_settled

        settled_at: None | str | Unset
        if isinstance(self.settled_at, Unset):
            settled_at = UNSET
        elif isinstance(self.settled_at, datetime.date):
            settled_at = self.settled_at.isoformat()
        else:
            settled_at = self.settled_at

        deleted_at: None | str | Unset
        if isinstance(self.deleted_at, Unset):
            deleted_at = UNSET
        elif isinstance(self.deleted_at, datetime.datetime):
            deleted_at = self.deleted_at.isoformat()
        else:
            deleted_at = self.deleted_at

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "direction": direction,
                "amount": amount,
                "id": id,
                "contact_id": contact_id,
                "created_at": created_at,
            }
        )
        if currency is not UNSET:
            field_dict["currency"] = currency
        if reason is not UNSET:
            field_dict["reason"] = reason
        if is_settled is not UNSET:
            field_dict["is_settled"] = is_settled
        if settled_at is not UNSET:
            field_dict["settled_at"] = settled_at
        if deleted_at is not UNSET:
            field_dict["deleted_at"] = deleted_at

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        direction = DebtDirection(d.pop("direction"))

        amount = d.pop("amount")

        id = UUID(d.pop("id"))

        contact_id = UUID(d.pop("contact_id"))

        created_at = isoparse(d.pop("created_at"))

        currency = d.pop("currency", UNSET)

        def _parse_reason(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        reason = _parse_reason(d.pop("reason", UNSET))

        is_settled = d.pop("is_settled", UNSET)

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

        def _parse_deleted_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                deleted_at_type_0 = isoparse(data)

                return deleted_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        deleted_at = _parse_deleted_at(d.pop("deleted_at", UNSET))

        debt_public = cls(
            direction=direction,
            amount=amount,
            id=id,
            contact_id=contact_id,
            created_at=created_at,
            currency=currency,
            reason=reason,
            is_settled=is_settled,
            settled_at=settled_at,
            deleted_at=deleted_at,
        )

        debt_public.additional_properties = d
        return debt_public

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
