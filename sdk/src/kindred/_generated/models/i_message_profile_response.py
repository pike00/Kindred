from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from dateutil.parser import isoparse
from typing import cast
import datetime

if TYPE_CHECKING:
    from ..models.i_message_profile_response_imessage_profile_type_0 import (
        IMessageProfileResponseImessageProfileType0,
    )


T = TypeVar("T", bound="IMessageProfileResponse")


@_attrs_define
class IMessageProfileResponse:
    """Response model for iMessage profile endpoint.

    Attributes:
        imessage_id (None | str | Unset):
        imessage_synced_at (datetime.datetime | None | Unset):
        imessage_profile (IMessageProfileResponseImessageProfileType0 | None | Unset):
        profile_hash (None | str | Unset):
    """

    imessage_id: None | str | Unset = UNSET
    imessage_synced_at: datetime.datetime | None | Unset = UNSET
    imessage_profile: IMessageProfileResponseImessageProfileType0 | None | Unset = UNSET
    profile_hash: None | str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.i_message_profile_response_imessage_profile_type_0 import (
            IMessageProfileResponseImessageProfileType0,
        )

        imessage_id: None | str | Unset
        if isinstance(self.imessage_id, Unset):
            imessage_id = UNSET
        else:
            imessage_id = self.imessage_id

        imessage_synced_at: None | str | Unset
        if isinstance(self.imessage_synced_at, Unset):
            imessage_synced_at = UNSET
        elif isinstance(self.imessage_synced_at, datetime.datetime):
            imessage_synced_at = self.imessage_synced_at.isoformat()
        else:
            imessage_synced_at = self.imessage_synced_at

        imessage_profile: dict[str, Any] | None | Unset
        if isinstance(self.imessage_profile, Unset):
            imessage_profile = UNSET
        elif isinstance(self.imessage_profile, IMessageProfileResponseImessageProfileType0):
            imessage_profile = self.imessage_profile.to_dict()
        else:
            imessage_profile = self.imessage_profile

        profile_hash: None | str | Unset
        if isinstance(self.profile_hash, Unset):
            profile_hash = UNSET
        else:
            profile_hash = self.profile_hash

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if imessage_id is not UNSET:
            field_dict["imessage_id"] = imessage_id
        if imessage_synced_at is not UNSET:
            field_dict["imessage_synced_at"] = imessage_synced_at
        if imessage_profile is not UNSET:
            field_dict["imessage_profile"] = imessage_profile
        if profile_hash is not UNSET:
            field_dict["profile_hash"] = profile_hash

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.i_message_profile_response_imessage_profile_type_0 import (
            IMessageProfileResponseImessageProfileType0,
        )

        d = dict(src_dict)

        def _parse_imessage_id(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        imessage_id = _parse_imessage_id(d.pop("imessage_id", UNSET))

        def _parse_imessage_synced_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                imessage_synced_at_type_0 = isoparse(data)

                return imessage_synced_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        imessage_synced_at = _parse_imessage_synced_at(d.pop("imessage_synced_at", UNSET))

        def _parse_imessage_profile(
            data: object,
        ) -> IMessageProfileResponseImessageProfileType0 | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                imessage_profile_type_0 = IMessageProfileResponseImessageProfileType0.from_dict(data)

                return imessage_profile_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(IMessageProfileResponseImessageProfileType0 | None | Unset, data)

        imessage_profile = _parse_imessage_profile(d.pop("imessage_profile", UNSET))

        def _parse_profile_hash(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        profile_hash = _parse_profile_hash(d.pop("profile_hash", UNSET))

        i_message_profile_response = cls(
            imessage_id=imessage_id,
            imessage_synced_at=imessage_synced_at,
            imessage_profile=imessage_profile,
            profile_hash=profile_hash,
        )

        i_message_profile_response.additional_properties = d
        return i_message_profile_response

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
