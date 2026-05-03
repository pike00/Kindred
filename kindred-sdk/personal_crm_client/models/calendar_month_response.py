from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from typing import cast

if TYPE_CHECKING:
  from ..models.calendar_month_response_days import CalendarMonthResponseDays





T = TypeVar("T", bound="CalendarMonthResponse")



@_attrs_define
class CalendarMonthResponse:
    """ 
        Attributes:
            month (str):
            days (CalendarMonthResponseDays):
     """

    month: str
    days: CalendarMonthResponseDays
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        from ..models.calendar_month_response_days import CalendarMonthResponseDays
        month = self.month

        days = self.days.to_dict()


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
            "month": month,
            "days": days,
        })

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.calendar_month_response_days import CalendarMonthResponseDays
        d = dict(src_dict)
        month = d.pop("month")

        days = CalendarMonthResponseDays.from_dict(d.pop("days"))




        calendar_month_response = cls(
            month=month,
            days=days,
        )


        calendar_month_response.additional_properties = d
        return calendar_month_response

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
