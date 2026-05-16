from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.i_message_profile_payload import IMessageProfilePayload
    from ..models.i_message_sync_request_co_mentions_type_0_item import IMessageSyncRequestCoMentionsType0Item


T = TypeVar("T", bound="IMessageSyncRequest")


@_attrs_define
class IMessageSyncRequest:
    """Request body for iMessage sync.

    Attributes:
        profiles (list[IMessageProfilePayload]): List of iMessage profiles to sync.
        sync_co_mentions (bool | Unset): Whether to also sync co-mention edges as relationships. Default: False.
        co_mentions (list[IMessageSyncRequestCoMentionsType0Item] | None | Unset): Co-mention edges from social.json.
    """

    profiles: list[IMessageProfilePayload]
    sync_co_mentions: bool | Unset = False
    co_mentions: list[IMessageSyncRequestCoMentionsType0Item] | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        profiles = []
        for profiles_item_data in self.profiles:
            profiles_item = profiles_item_data.to_dict()
            profiles.append(profiles_item)

        sync_co_mentions = self.sync_co_mentions

        co_mentions: list[dict[str, Any]] | None | Unset
        if isinstance(self.co_mentions, Unset):
            co_mentions = UNSET
        elif isinstance(self.co_mentions, list):
            co_mentions = []
            for co_mentions_type_0_item_data in self.co_mentions:
                co_mentions_type_0_item = co_mentions_type_0_item_data.to_dict()
                co_mentions.append(co_mentions_type_0_item)

        else:
            co_mentions = self.co_mentions

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "profiles": profiles,
            }
        )
        if sync_co_mentions is not UNSET:
            field_dict["sync_co_mentions"] = sync_co_mentions
        if co_mentions is not UNSET:
            field_dict["co_mentions"] = co_mentions

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.i_message_profile_payload import IMessageProfilePayload
        from ..models.i_message_sync_request_co_mentions_type_0_item import (
            IMessageSyncRequestCoMentionsType0Item,
        )

        d = dict(src_dict)
        profiles = []
        _profiles = d.pop("profiles")
        for profiles_item_data in _profiles:
            profiles_item = IMessageProfilePayload.from_dict(profiles_item_data)

            profiles.append(profiles_item)

        sync_co_mentions = d.pop("sync_co_mentions", UNSET)

        def _parse_co_mentions(data: object) -> list[IMessageSyncRequestCoMentionsType0Item] | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, list):
                    raise TypeError()
                co_mentions_type_0 = []
                _co_mentions_type_0 = data
                for co_mentions_type_0_item_data in _co_mentions_type_0:
                    co_mentions_type_0_item = IMessageSyncRequestCoMentionsType0Item.from_dict(
                        co_mentions_type_0_item_data
                    )

                    co_mentions_type_0.append(co_mentions_type_0_item)

                return co_mentions_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(list[IMessageSyncRequestCoMentionsType0Item] | None | Unset, data)

        co_mentions = _parse_co_mentions(d.pop("co_mentions", UNSET))

        i_message_sync_request = cls(
            profiles=profiles,
            sync_co_mentions=sync_co_mentions,
            co_mentions=co_mentions,
        )

        i_message_sync_request.additional_properties = d
        return i_message_sync_request

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
