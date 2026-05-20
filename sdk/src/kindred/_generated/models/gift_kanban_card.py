from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
    from ..models.gift_public import GiftPublic


T = TypeVar("T", bound="GiftKanbanCard")


@_attrs_define
class GiftKanbanCard:
    """
    Attributes:
        gift (GiftPublic):
        is_overdue (bool):
        days_until_occasion (int | None | Unset):
    """

    gift: GiftPublic
    is_overdue: bool
    days_until_occasion: int | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.gift_public import GiftPublic

        gift = self.gift.to_dict()

        is_overdue = self.is_overdue

        days_until_occasion: int | None | Unset
        if isinstance(self.days_until_occasion, Unset):
            days_until_occasion = UNSET
        else:
            days_until_occasion = self.days_until_occasion

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "gift": gift,
                "is_overdue": is_overdue,
            }
        )
        if days_until_occasion is not UNSET:
            field_dict["days_until_occasion"] = days_until_occasion

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.gift_public import GiftPublic

        d = dict(src_dict)
        gift = GiftPublic.from_dict(d.pop("gift"))

        is_overdue = d.pop("is_overdue")

        def _parse_days_until_occasion(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        days_until_occasion = _parse_days_until_occasion(d.pop("days_until_occasion", UNSET))

        gift_kanban_card = cls(
            gift=gift,
            is_overdue=is_overdue,
            days_until_occasion=days_until_occasion,
        )

        gift_kanban_card.additional_properties = d
        return gift_kanban_card

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
