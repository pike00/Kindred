from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset


T = TypeVar("T", bound="ContactShareIn")


@_attrs_define
class ContactShareIn:
    """
    Attributes:
        grantee_email (str):
    """

    grantee_email: str

    def to_dict(self) -> dict[str, Any]:
        grantee_email = self.grantee_email

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "grantee_email": grantee_email,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        grantee_email = d.pop("grantee_email")

        contact_share_in = cls(
            grantee_email=grantee_email,
        )

        return contact_share_in
