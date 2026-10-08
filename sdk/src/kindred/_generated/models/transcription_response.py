from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast
from uuid import UUID


T = TypeVar("T", bound="TranscriptionResponse")


@_attrs_define
class TranscriptionResponse:
    """
    Attributes:
        text (str):
        capture_id (UUID):
        language (None | str | Unset):
        duration (float | None | Unset):
    """

    text: str
    capture_id: UUID
    language: None | str | Unset = UNSET
    duration: float | None | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        text = self.text

        capture_id = str(self.capture_id)

        language: None | str | Unset
        if isinstance(self.language, Unset):
            language = UNSET
        else:
            language = self.language

        duration: float | None | Unset
        if isinstance(self.duration, Unset):
            duration = UNSET
        else:
            duration = self.duration

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "text": text,
                "capture_id": capture_id,
            }
        )
        if language is not UNSET:
            field_dict["language"] = language
        if duration is not UNSET:
            field_dict["duration"] = duration

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        text = d.pop("text")

        capture_id = UUID(d.pop("capture_id"))

        def _parse_language(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        language = _parse_language(d.pop("language", UNSET))

        def _parse_duration(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        duration = _parse_duration(d.pop("duration", UNSET))

        transcription_response = cls(
            text=text,
            capture_id=capture_id,
            language=language,
            duration=duration,
        )

        return transcription_response
