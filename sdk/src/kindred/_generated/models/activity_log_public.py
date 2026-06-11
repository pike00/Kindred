from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from typing import cast
from uuid import UUID
import datetime

if TYPE_CHECKING:
    from ..models.activity_log_public_changes_json_type_0 import ActivityLogPublicChangesJsonType0


T = TypeVar("T", bound="ActivityLogPublic")


@_attrs_define
class ActivityLogPublic:
    """
    Attributes:
        id (UUID):
        owner_id (UUID):
        actor_id (None | UUID):
        entity_type (str):
        entity_id (UUID):
        action (str):
        changes_json (ActivityLogPublicChangesJsonType0 | None):
        occurred_at (datetime.datetime):
    """

    id: UUID
    owner_id: UUID
    actor_id: None | UUID
    entity_type: str
    entity_id: UUID
    action: str
    changes_json: ActivityLogPublicChangesJsonType0 | None
    occurred_at: datetime.datetime
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.activity_log_public_changes_json_type_0 import ActivityLogPublicChangesJsonType0

        id = str(self.id)

        owner_id = str(self.owner_id)

        actor_id: None | str
        if isinstance(self.actor_id, UUID):
            actor_id = str(self.actor_id)
        else:
            actor_id = self.actor_id

        entity_type = self.entity_type

        entity_id = str(self.entity_id)

        action = self.action

        changes_json: dict[str, Any] | None
        if isinstance(self.changes_json, ActivityLogPublicChangesJsonType0):
            changes_json = self.changes_json.to_dict()
        else:
            changes_json = self.changes_json

        occurred_at = self.occurred_at.isoformat()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "owner_id": owner_id,
                "actor_id": actor_id,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "action": action,
                "changes_json": changes_json,
                "occurred_at": occurred_at,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.activity_log_public_changes_json_type_0 import ActivityLogPublicChangesJsonType0

        d = dict(src_dict)
        id = UUID(d.pop("id"))

        owner_id = UUID(d.pop("owner_id"))

        def _parse_actor_id(data: object) -> None | UUID:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                actor_id_type_0 = UUID(data)

                return actor_id_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | UUID, data)

        actor_id = _parse_actor_id(d.pop("actor_id"))

        entity_type = d.pop("entity_type")

        entity_id = UUID(d.pop("entity_id"))

        action = d.pop("action")

        def _parse_changes_json(data: object) -> ActivityLogPublicChangesJsonType0 | None:
            if data is None:
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                changes_json_type_0 = ActivityLogPublicChangesJsonType0.from_dict(data)

                return changes_json_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(ActivityLogPublicChangesJsonType0 | None, data)

        changes_json = _parse_changes_json(d.pop("changes_json"))

        occurred_at = datetime.datetime.fromisoformat(d.pop("occurred_at"))

        activity_log_public = cls(
            id=id,
            owner_id=owner_id,
            actor_id=actor_id,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            changes_json=changes_json,
            occurred_at=occurred_at,
        )

        activity_log_public.additional_properties = d
        return activity_log_public

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
