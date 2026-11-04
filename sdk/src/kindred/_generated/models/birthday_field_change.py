from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from dateutil.parser import isoparse
from typing import cast
from typing import Literal, cast
import datetime


T = TypeVar("T", bound="BirthdayFieldChange")


@_attrs_define
class BirthdayFieldChange:
    """
    Attributes:
        field (Literal['birthday']):
        value (datetime.date | None):
    """

    field: Literal["birthday"]
    value: datetime.date | None

    def to_dict(self) -> dict[str, Any]:
        field = self.field

        value: None | str
        if isinstance(self.value, datetime.date):
            value = self.value.isoformat()
        else:
            value = self.value

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "field": field,
                "value": value,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        field = cast(Literal["birthday"], d.pop("field"))
        if field != "birthday":
            raise ValueError(f"field must match const 'birthday', got '{field}'")

        def _parse_value(data: object) -> datetime.date | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                value_type_0 = isoparse(data).date()

                return value_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.date | None, data)

        value = _parse_value(d.pop("value"))

        birthday_field_change = cls(
            field=field,
            value=value,
        )

        return birthday_field_change
