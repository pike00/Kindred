from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from typing import cast

if TYPE_CHECKING:
    from ..models.voice_capture_public import VoiceCapturePublic


T = TypeVar("T", bound="VoiceCapturesPublic")


@_attrs_define
class VoiceCapturesPublic:
    """
    Attributes:
        data (list[VoiceCapturePublic]):
        count (int):
    """

    data: list[VoiceCapturePublic]
    count: int

    def to_dict(self) -> dict[str, Any]:
        from ..models.voice_capture_public import VoiceCapturePublic

        data = []
        for data_item_data in self.data:
            data_item = data_item_data.to_dict()
            data.append(data_item)

        count = self.count

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "data": data,
                "count": count,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.voice_capture_public import VoiceCapturePublic

        d = dict(src_dict)
        data = []
        _data = d.pop("data")
        for data_item_data in _data:
            data_item = VoiceCapturePublic.from_dict(data_item_data)

            data.append(data_item)

        count = d.pop("count")

        voice_captures_public = cls(
            data=data,
            count=count,
        )

        return voice_captures_public
