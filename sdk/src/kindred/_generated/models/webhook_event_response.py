from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast


T = TypeVar("T", bound="WebhookEventResponse")


@_attrs_define
class WebhookEventResponse:
    """
    Attributes:
        received (bool | Unset):  Default: True.
        matched (bool | Unset):  Default: False.
        channel (None | str | Unset):
        contact_id (None | str | Unset):
        interaction_id (None | str | Unset):
        call_status (None | str | Unset):
        error (None | str | Unset):
    """

    received: bool | Unset = True
    matched: bool | Unset = False
    channel: None | str | Unset = UNSET
    contact_id: None | str | Unset = UNSET
    interaction_id: None | str | Unset = UNSET
    call_status: None | str | Unset = UNSET
    error: None | str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        received = self.received

        matched = self.matched

        channel: None | str | Unset
        if isinstance(self.channel, Unset):
            channel = UNSET
        else:
            channel = self.channel

        contact_id: None | str | Unset
        if isinstance(self.contact_id, Unset):
            contact_id = UNSET
        else:
            contact_id = self.contact_id

        interaction_id: None | str | Unset
        if isinstance(self.interaction_id, Unset):
            interaction_id = UNSET
        else:
            interaction_id = self.interaction_id

        call_status: None | str | Unset
        if isinstance(self.call_status, Unset):
            call_status = UNSET
        else:
            call_status = self.call_status

        error: None | str | Unset
        if isinstance(self.error, Unset):
            error = UNSET
        else:
            error = self.error

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if received is not UNSET:
            field_dict["received"] = received
        if matched is not UNSET:
            field_dict["matched"] = matched
        if channel is not UNSET:
            field_dict["channel"] = channel
        if contact_id is not UNSET:
            field_dict["contact_id"] = contact_id
        if interaction_id is not UNSET:
            field_dict["interaction_id"] = interaction_id
        if call_status is not UNSET:
            field_dict["call_status"] = call_status
        if error is not UNSET:
            field_dict["error"] = error

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        received = d.pop("received", UNSET)

        matched = d.pop("matched", UNSET)

        def _parse_channel(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        channel = _parse_channel(d.pop("channel", UNSET))

        def _parse_contact_id(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        contact_id = _parse_contact_id(d.pop("contact_id", UNSET))

        def _parse_interaction_id(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        interaction_id = _parse_interaction_id(d.pop("interaction_id", UNSET))

        def _parse_call_status(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        call_status = _parse_call_status(d.pop("call_status", UNSET))

        def _parse_error(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        error = _parse_error(d.pop("error", UNSET))

        webhook_event_response = cls(
            received=received,
            matched=matched,
            channel=channel,
            contact_id=contact_id,
            interaction_id=interaction_id,
            call_status=call_status,
            error=error,
        )

        webhook_event_response.additional_properties = d
        return webhook_event_response

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
