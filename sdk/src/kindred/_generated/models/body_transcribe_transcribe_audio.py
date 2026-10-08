from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field
import json
from .. import types

from ..types import UNSET, Unset

from ..types import File, FileTypes
from ..types import UNSET, Unset
from io import BytesIO
from typing import cast
from uuid import UUID


T = TypeVar("T", bound="BodyTranscribeTranscribeAudio")


@_attrs_define
class BodyTranscribeTranscribeAudio:
    """
    Attributes:
        file (File):
        timezone (str | Unset):  Default: 'UTC'.
        contact_ids (list[UUID] | Unset):
    """

    file: File
    timezone: str | Unset = "UTC"
    contact_ids: list[UUID] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        file = self.file.to_tuple()

        timezone = self.timezone

        contact_ids: list[str] | Unset = UNSET
        if not isinstance(self.contact_ids, Unset):
            contact_ids = []
            for contact_ids_item_data in self.contact_ids:
                contact_ids_item = str(contact_ids_item_data)
                contact_ids.append(contact_ids_item)

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "file": file,
            }
        )
        if timezone is not UNSET:
            field_dict["timezone"] = timezone
        if contact_ids is not UNSET:
            field_dict["contact_ids"] = contact_ids

        return field_dict

    def to_multipart(self) -> types.RequestFiles:
        files: types.RequestFiles = []

        files.append(("file", self.file.to_tuple()))

        if not isinstance(self.timezone, Unset):
            files.append(("timezone", (None, str(self.timezone).encode(), "text/plain")))

        if not isinstance(self.contact_ids, Unset):
            for contact_ids_item_element in self.contact_ids:
                files.append(("contact_ids", (None, str(contact_ids_item_element), "text/plain")))

        for prop_name, prop in self.additional_properties.items():
            files.append((prop_name, (None, str(prop).encode(), "text/plain")))

        return files

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        file = File(payload=BytesIO(d.pop("file")))

        timezone = d.pop("timezone", UNSET)

        _contact_ids = d.pop("contact_ids", UNSET)
        contact_ids: list[UUID] | Unset = UNSET
        if _contact_ids is not UNSET:
            contact_ids = []
            for contact_ids_item_data in _contact_ids:
                contact_ids_item = UUID(contact_ids_item_data)

                contact_ids.append(contact_ids_item)

        body_transcribe_transcribe_audio = cls(
            file=file,
            timezone=timezone,
            contact_ids=contact_ids,
        )

        body_transcribe_transcribe_audio.additional_properties = d
        return body_transcribe_transcribe_audio

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
