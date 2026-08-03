from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast
from uuid import UUID


T = TypeVar("T", bound="ContactShareIn")


@_attrs_define
class ContactShareIn:
    """
    Attributes:
        grantee_id (None | Unset | UUID):
        grantee_email (None | str | Unset):
    """

    grantee_id: None | Unset | UUID = UNSET
    grantee_email: None | str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        grantee_id: None | str | Unset
        if isinstance(self.grantee_id, Unset):
            grantee_id = UNSET
        elif isinstance(self.grantee_id, UUID):
            grantee_id = str(self.grantee_id)
        else:
            grantee_id = self.grantee_id

        grantee_email: None | str | Unset
        if isinstance(self.grantee_email, Unset):
            grantee_email = UNSET
        else:
            grantee_email = self.grantee_email

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if grantee_id is not UNSET:
            field_dict["grantee_id"] = grantee_id
        if grantee_email is not UNSET:
            field_dict["grantee_email"] = grantee_email

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)

        def _parse_grantee_id(data: object) -> None | Unset | UUID:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                grantee_id_type_0 = UUID(data)

                return grantee_id_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | Unset | UUID, data)

        grantee_id = _parse_grantee_id(d.pop("grantee_id", UNSET))

        def _parse_grantee_email(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        grantee_email = _parse_grantee_email(d.pop("grantee_email", UNSET))

        contact_share_in = cls(
            grantee_id=grantee_id,
            grantee_email=grantee_email,
        )

        contact_share_in.additional_properties = d
        return contact_share_in

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
