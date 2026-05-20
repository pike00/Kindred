from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from typing import cast

if TYPE_CHECKING:
    from ..models.gift_kanban_card import GiftKanbanCard


T = TypeVar("T", bound="GiftKanbanColumn")


@_attrs_define
class GiftKanbanColumn:
    """
    Attributes:
        gifts (list[GiftKanbanCard]):
        count (int):
        total_value (float):
    """

    gifts: list[GiftKanbanCard]
    count: int
    total_value: float
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.gift_kanban_card import GiftKanbanCard

        gifts = []
        for gifts_item_data in self.gifts:
            gifts_item = gifts_item_data.to_dict()
            gifts.append(gifts_item)

        count = self.count

        total_value = self.total_value

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "gifts": gifts,
                "count": count,
                "total_value": total_value,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.gift_kanban_card import GiftKanbanCard

        d = dict(src_dict)
        gifts = []
        _gifts = d.pop("gifts")
        for gifts_item_data in _gifts:
            gifts_item = GiftKanbanCard.from_dict(gifts_item_data)

            gifts.append(gifts_item)

        count = d.pop("count")

        total_value = d.pop("total_value")

        gift_kanban_column = cls(
            gifts=gifts,
            count=count,
            total_value=total_value,
        )

        gift_kanban_column.additional_properties = d
        return gift_kanban_column

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
