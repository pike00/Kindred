from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.text_contact_field_change_field import TextContactFieldChangeField
from typing import cast


T = TypeVar("T", bound="TextContactFieldChange")


@_attrs_define
class TextContactFieldChange:
    """
    Attributes:
        field (TextContactFieldChangeField):
        value (None | str):
    """

    field: TextContactFieldChangeField
    value: None | str

    def to_dict(self) -> dict[str, Any]:
        field = self.field.value

        value: None | str
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
        field = TextContactFieldChangeField(d.pop("field"))

        def _parse_value(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        value = _parse_value(d.pop("value"))

        text_contact_field_change = cls(
            field=field,
            value=value,
        )

        return text_contact_field_change
