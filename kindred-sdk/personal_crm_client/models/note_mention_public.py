from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from dateutil.parser import isoparse
from typing import cast
from uuid import UUID
import datetime

if TYPE_CHECKING:
  from ..models.mention_source_contact import MentionSourceContact





T = TypeVar("T", bound="NoteMentionPublic")



@_attrs_define
class NoteMentionPublic:
    """ 
        Attributes:
            note_id (UUID):
            note_body (str):
            note_created_at (datetime.datetime):
            source_contact (MentionSourceContact):
     """

    note_id: UUID
    note_body: str
    note_created_at: datetime.datetime
    source_contact: MentionSourceContact
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        from ..models.mention_source_contact import MentionSourceContact
        note_id = str(self.note_id)

        note_body = self.note_body

        note_created_at = self.note_created_at.isoformat()

        source_contact = self.source_contact.to_dict()


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
            "note_id": note_id,
            "note_body": note_body,
            "note_created_at": note_created_at,
            "source_contact": source_contact,
        })

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.mention_source_contact import MentionSourceContact
        d = dict(src_dict)
        note_id = UUID(d.pop("note_id"))




        note_body = d.pop("note_body")

        note_created_at = isoparse(d.pop("note_created_at"))




        source_contact = MentionSourceContact.from_dict(d.pop("source_contact"))




        note_mention_public = cls(
            note_id=note_id,
            note_body=note_body,
            note_created_at=note_created_at,
            source_contact=source_contact,
        )


        note_mention_public.additional_properties = d
        return note_mention_public

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
