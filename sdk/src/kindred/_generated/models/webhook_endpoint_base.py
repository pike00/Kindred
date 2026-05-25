from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast


T = TypeVar("T", bound="WebhookEndpointBase")


@_attrs_define
class WebhookEndpointBase:
    """
    Attributes:
        name (str): Human-readable endpoint name.
        direction (str): "inbound" or "outbound".
        url (None | str | Unset): Target URL for outbound webhooks; null for inbound.
        event_types (None | str | Unset): Comma-separated event types (e.g. contact.created,interaction.logged).
        is_active (bool | Unset): Enable or disable without deleting. Default: True.
        secret (None | str | Unset): HMAC secret for verifying inbound payloads.
    """

    name: str
    direction: str
    url: None | str | Unset = UNSET
    event_types: None | str | Unset = UNSET
    is_active: bool | Unset = True
    secret: None | str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        name = self.name

        direction = self.direction

        url: None | str | Unset
        if isinstance(self.url, Unset):
            url = UNSET
        else:
            url = self.url

        event_types: None | str | Unset
        if isinstance(self.event_types, Unset):
            event_types = UNSET
        else:
            event_types = self.event_types

        is_active = self.is_active

        secret: None | str | Unset
        if isinstance(self.secret, Unset):
            secret = UNSET
        else:
            secret = self.secret

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "name": name,
                "direction": direction,
            }
        )
        if url is not UNSET:
            field_dict["url"] = url
        if event_types is not UNSET:
            field_dict["event_types"] = event_types
        if is_active is not UNSET:
            field_dict["is_active"] = is_active
        if secret is not UNSET:
            field_dict["secret"] = secret

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        name = d.pop("name")

        direction = d.pop("direction")

        def _parse_url(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        url = _parse_url(d.pop("url", UNSET))

        def _parse_event_types(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        event_types = _parse_event_types(d.pop("event_types", UNSET))

        is_active = d.pop("is_active", UNSET)

        def _parse_secret(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        secret = _parse_secret(d.pop("secret", UNSET))

        webhook_endpoint_base = cls(
            name=name,
            direction=direction,
            url=url,
            event_types=event_types,
            is_active=is_active,
            secret=secret,
        )

        webhook_endpoint_base.additional_properties = d
        return webhook_endpoint_base

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
