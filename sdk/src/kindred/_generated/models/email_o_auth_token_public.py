from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast
from uuid import UUID
import datetime


T = TypeVar("T", bound="EmailOAuthTokenPublic")


@_attrs_define
class EmailOAuthTokenPublic:
    """
    Attributes:
        email_address (str): The email address these tokens are for.
        encrypted_access_token (str): Encrypted access token for the Gmail API.
        id (UUID):
        contact_id (UUID):
        created_at (datetime.datetime):
        updated_at (datetime.datetime):
        provider (str | Unset): OAuth provider name (e.g. 'gmail'). Default: 'gmail'.
        encrypted_refresh_token (None | str | Unset): Encrypted refresh token for obtaining new access tokens.
        token_expires_at (datetime.datetime | None | Unset): When the access token expires (UTC).
    """

    email_address: str
    encrypted_access_token: str
    id: UUID
    contact_id: UUID
    created_at: datetime.datetime
    updated_at: datetime.datetime
    provider: str | Unset = "gmail"
    encrypted_refresh_token: None | str | Unset = UNSET
    token_expires_at: datetime.datetime | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        email_address = self.email_address

        encrypted_access_token = self.encrypted_access_token

        id = str(self.id)

        contact_id = str(self.contact_id)

        created_at = self.created_at.isoformat()

        updated_at = self.updated_at.isoformat()

        provider = self.provider

        encrypted_refresh_token: None | str | Unset
        if isinstance(self.encrypted_refresh_token, Unset):
            encrypted_refresh_token = UNSET
        else:
            encrypted_refresh_token = self.encrypted_refresh_token

        token_expires_at: None | str | Unset
        if isinstance(self.token_expires_at, Unset):
            token_expires_at = UNSET
        elif isinstance(self.token_expires_at, datetime.datetime):
            token_expires_at = self.token_expires_at.isoformat()
        else:
            token_expires_at = self.token_expires_at

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "email_address": email_address,
                "encrypted_access_token": encrypted_access_token,
                "id": id,
                "contact_id": contact_id,
                "created_at": created_at,
                "updated_at": updated_at,
            }
        )
        if provider is not UNSET:
            field_dict["provider"] = provider
        if encrypted_refresh_token is not UNSET:
            field_dict["encrypted_refresh_token"] = encrypted_refresh_token
        if token_expires_at is not UNSET:
            field_dict["token_expires_at"] = token_expires_at

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        email_address = d.pop("email_address")

        encrypted_access_token = d.pop("encrypted_access_token")

        id = UUID(d.pop("id"))

        contact_id = UUID(d.pop("contact_id"))

        created_at = datetime.datetime.fromisoformat(d.pop("created_at"))

        updated_at = datetime.datetime.fromisoformat(d.pop("updated_at"))

        provider = d.pop("provider", UNSET)

        def _parse_encrypted_refresh_token(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        encrypted_refresh_token = _parse_encrypted_refresh_token(d.pop("encrypted_refresh_token", UNSET))

        def _parse_token_expires_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                token_expires_at_type_0 = datetime.datetime.fromisoformat(data)

                return token_expires_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        token_expires_at = _parse_token_expires_at(d.pop("token_expires_at", UNSET))

        email_o_auth_token_public = cls(
            email_address=email_address,
            encrypted_access_token=encrypted_access_token,
            id=id,
            contact_id=contact_id,
            created_at=created_at,
            updated_at=updated_at,
            provider=provider,
            encrypted_refresh_token=encrypted_refresh_token,
            token_expires_at=token_expires_at,
        )

        email_o_auth_token_public.additional_properties = d
        return email_o_auth_token_public

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
