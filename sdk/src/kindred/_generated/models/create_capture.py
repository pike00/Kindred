from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset


T = TypeVar("T", bound="CreateCapture")


@_attrs_define
class CreateCapture:
    """
    Attributes:
        raw_text (str):
        timezone (str):
    """

    raw_text: str
    timezone: str

    def to_dict(self) -> dict[str, Any]:
        raw_text = self.raw_text

        timezone = self.timezone

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "raw_text": raw_text,
                "timezone": timezone,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        raw_text = d.pop("raw_text")

        timezone = d.pop("timezone")

        create_capture = cls(
            raw_text=raw_text,
            timezone=timezone,
        )

        return create_capture
