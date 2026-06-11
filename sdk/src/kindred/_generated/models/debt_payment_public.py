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


T = TypeVar("T", bound="DebtPaymentPublic")


@_attrs_define
class DebtPaymentPublic:
    """
    Attributes:
        id (UUID):
        debt_id (UUID):
        amount (float):
        paid_at (datetime.date):
        created_at (datetime.datetime):
        note (None | str | Unset):
    """

    id: UUID
    debt_id: UUID
    amount: float
    paid_at: datetime.date
    created_at: datetime.datetime
    note: None | str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = str(self.id)

        debt_id = str(self.debt_id)

        amount = self.amount

        paid_at = self.paid_at.isoformat()

        created_at = self.created_at.isoformat()

        note: None | str | Unset
        if isinstance(self.note, Unset):
            note = UNSET
        else:
            note = self.note

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "debt_id": debt_id,
                "amount": amount,
                "paid_at": paid_at,
                "created_at": created_at,
            }
        )
        if note is not UNSET:
            field_dict["note"] = note

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        id = UUID(d.pop("id"))

        debt_id = UUID(d.pop("debt_id"))

        amount = d.pop("amount")

        paid_at = datetime.date.fromisoformat(d.pop("paid_at"))

        created_at = datetime.datetime.fromisoformat(d.pop("created_at"))

        def _parse_note(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        note = _parse_note(d.pop("note", UNSET))

        debt_payment_public = cls(
            id=id,
            debt_id=debt_id,
            amount=amount,
            paid_at=paid_at,
            created_at=created_at,
            note=note,
        )

        debt_payment_public.additional_properties = d
        return debt_payment_public

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
