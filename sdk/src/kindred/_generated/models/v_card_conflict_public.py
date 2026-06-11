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


T = TypeVar("T", bound="VCardConflictPublic")


@_attrs_define
class VCardConflictPublic:
    """Public schema for returning conflict data to the API.

    Attributes:
        contact_id (UUID): The contact that has a conflict.
        incoming_vcard_raw (str):
        incoming_hash (str): SHA-256 hash of the incoming normalized vCard.
        local_hash (str): SHA-256 hash of the locally-stored normalized vCard at time of conflict.
        id (UUID):
        created_at (datetime.datetime):
        resolved_at (datetime.datetime | None | Unset): When the conflict was resolved; None means pending.
        resolution_type (None | str | Unset): How the conflict was resolved: 'keep_local', 'accept_remote',
            'manual_merge'.
        local_vcard_raw (None | str | Unset): The locally-stored vCard at time of conflict.
    """

    contact_id: UUID
    incoming_vcard_raw: str
    incoming_hash: str
    local_hash: str
    id: UUID
    created_at: datetime.datetime
    resolved_at: datetime.datetime | None | Unset = UNSET
    resolution_type: None | str | Unset = UNSET
    local_vcard_raw: None | str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        contact_id = str(self.contact_id)

        incoming_vcard_raw = self.incoming_vcard_raw

        incoming_hash = self.incoming_hash

        local_hash = self.local_hash

        id = str(self.id)

        created_at = self.created_at.isoformat()

        resolved_at: None | str | Unset
        if isinstance(self.resolved_at, Unset):
            resolved_at = UNSET
        elif isinstance(self.resolved_at, datetime.datetime):
            resolved_at = self.resolved_at.isoformat()
        else:
            resolved_at = self.resolved_at

        resolution_type: None | str | Unset
        if isinstance(self.resolution_type, Unset):
            resolution_type = UNSET
        else:
            resolution_type = self.resolution_type

        local_vcard_raw: None | str | Unset
        if isinstance(self.local_vcard_raw, Unset):
            local_vcard_raw = UNSET
        else:
            local_vcard_raw = self.local_vcard_raw

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "contact_id": contact_id,
                "incoming_vcard_raw": incoming_vcard_raw,
                "incoming_hash": incoming_hash,
                "local_hash": local_hash,
                "id": id,
                "created_at": created_at,
            }
        )
        if resolved_at is not UNSET:
            field_dict["resolved_at"] = resolved_at
        if resolution_type is not UNSET:
            field_dict["resolution_type"] = resolution_type
        if local_vcard_raw is not UNSET:
            field_dict["local_vcard_raw"] = local_vcard_raw

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        contact_id = UUID(d.pop("contact_id"))

        incoming_vcard_raw = d.pop("incoming_vcard_raw")

        incoming_hash = d.pop("incoming_hash")

        local_hash = d.pop("local_hash")

        id = UUID(d.pop("id"))

        created_at = datetime.datetime.fromisoformat(d.pop("created_at"))

        def _parse_resolved_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                resolved_at_type_0 = datetime.datetime.fromisoformat(data)

                return resolved_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        resolved_at = _parse_resolved_at(d.pop("resolved_at", UNSET))

        def _parse_resolution_type(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        resolution_type = _parse_resolution_type(d.pop("resolution_type", UNSET))

        def _parse_local_vcard_raw(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        local_vcard_raw = _parse_local_vcard_raw(d.pop("local_vcard_raw", UNSET))

        v_card_conflict_public = cls(
            contact_id=contact_id,
            incoming_vcard_raw=incoming_vcard_raw,
            incoming_hash=incoming_hash,
            local_hash=local_hash,
            id=id,
            created_at=created_at,
            resolved_at=resolved_at,
            resolution_type=resolution_type,
            local_vcard_raw=local_vcard_raw,
        )

        v_card_conflict_public.additional_properties = d
        return v_card_conflict_public

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
