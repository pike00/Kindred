from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from typing import cast
from uuid import UUID
import datetime


T = TypeVar("T", bound="AllContactsSharePublic")


@_attrs_define
class AllContactsSharePublic:
    """
    Attributes:
        grantee_id (UUID):
        grantee_email (str):
        created_at (datetime.datetime):
    """

    grantee_id: UUID
    grantee_email: str
    created_at: datetime.datetime
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        grantee_id = str(self.grantee_id)

        grantee_email = self.grantee_email

        created_at = self.created_at.isoformat()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "grantee_id": grantee_id,
                "grantee_email": grantee_email,
                "created_at": created_at,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        grantee_id = UUID(d.pop("grantee_id"))

        grantee_email = d.pop("grantee_email")

        created_at = datetime.datetime.fromisoformat(d.pop("created_at"))

        all_contacts_share_public = cls(
            grantee_id=grantee_id,
            grantee_email=grantee_email,
            created_at=created_at,
        )

        all_contacts_share_public.additional_properties = d
        return all_contacts_share_public

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
