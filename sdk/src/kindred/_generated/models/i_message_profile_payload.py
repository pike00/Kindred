from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="IMessageProfilePayload")


@_attrs_define
class IMessageProfilePayload:
    """iMessage profile data from social.json.

    Attributes:
        imessage_id (str): E.164 phone or email for stable iMessage identity.
        relationship_type (None | str | Unset): iMessage relationship type (close_friend, family, etc.).
        key_events (list[str] | None | Unset): Key events from iMessage.
        topics (list[str] | None | Unset): Topics discussed in messages.
        facts_about_other (None | str | Unset): Facts about the contact from message analysis.
        pattern_notes (None | str | Unset): Pattern notes from iMessage analysis.
        last_ts (int | None | Unset): Last message timestamp (Unix epoch).
        message_count (int | None | Unset): Total message count.
        profile_hash (None | str | Unset): Hash of profile data for idempotent updates.
    """

    imessage_id: str
    relationship_type: None | str | Unset = UNSET
    key_events: list[str] | None | Unset = UNSET
    topics: list[str] | None | Unset = UNSET
    facts_about_other: None | str | Unset = UNSET
    pattern_notes: None | str | Unset = UNSET
    last_ts: int | None | Unset = UNSET
    message_count: int | None | Unset = UNSET
    profile_hash: None | str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        imessage_id = self.imessage_id

        relationship_type: None | str | Unset
        if isinstance(self.relationship_type, Unset):
            relationship_type = UNSET
        else:
            relationship_type = self.relationship_type

        key_events: list[str] | None | Unset
        if isinstance(self.key_events, Unset):
            key_events = UNSET
        elif isinstance(self.key_events, list):
            key_events = self.key_events

        else:
            key_events = self.key_events

        topics: list[str] | None | Unset
        if isinstance(self.topics, Unset):
            topics = UNSET
        elif isinstance(self.topics, list):
            topics = self.topics

        else:
            topics = self.topics

        facts_about_other: None | str | Unset
        if isinstance(self.facts_about_other, Unset):
            facts_about_other = UNSET
        else:
            facts_about_other = self.facts_about_other

        pattern_notes: None | str | Unset
        if isinstance(self.pattern_notes, Unset):
            pattern_notes = UNSET
        else:
            pattern_notes = self.pattern_notes

        last_ts: int | None | Unset
        if isinstance(self.last_ts, Unset):
            last_ts = UNSET
        else:
            last_ts = self.last_ts

        message_count: int | None | Unset
        if isinstance(self.message_count, Unset):
            message_count = UNSET
        else:
            message_count = self.message_count

        profile_hash: None | str | Unset
        if isinstance(self.profile_hash, Unset):
            profile_hash = UNSET
        else:
            profile_hash = self.profile_hash

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "imessage_id": imessage_id,
            }
        )
        if relationship_type is not UNSET:
            field_dict["relationship_type"] = relationship_type
        if key_events is not UNSET:
            field_dict["key_events"] = key_events
        if topics is not UNSET:
            field_dict["topics"] = topics
        if facts_about_other is not UNSET:
            field_dict["facts_about_other"] = facts_about_other
        if pattern_notes is not UNSET:
            field_dict["pattern_notes"] = pattern_notes
        if last_ts is not UNSET:
            field_dict["last_ts"] = last_ts
        if message_count is not UNSET:
            field_dict["message_count"] = message_count
        if profile_hash is not UNSET:
            field_dict["profile_hash"] = profile_hash

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        imessage_id = d.pop("imessage_id")

        def _parse_relationship_type(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        relationship_type = _parse_relationship_type(d.pop("relationship_type", UNSET))

        def _parse_key_events(data: object) -> list[str] | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, list):
                    raise TypeError()
                key_events_type_0 = cast(list[str], data)

                return key_events_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(list[str] | None | Unset, data)

        key_events = _parse_key_events(d.pop("key_events", UNSET))

        def _parse_topics(data: object) -> list[str] | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, list):
                    raise TypeError()
                topics_type_0 = cast(list[str], data)

                return topics_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(list[str] | None | Unset, data)

        topics = _parse_topics(d.pop("topics", UNSET))

        def _parse_facts_about_other(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        facts_about_other = _parse_facts_about_other(d.pop("facts_about_other", UNSET))

        def _parse_pattern_notes(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        pattern_notes = _parse_pattern_notes(d.pop("pattern_notes", UNSET))

        def _parse_last_ts(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        last_ts = _parse_last_ts(d.pop("last_ts", UNSET))

        def _parse_message_count(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        message_count = _parse_message_count(d.pop("message_count", UNSET))

        def _parse_profile_hash(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        profile_hash = _parse_profile_hash(d.pop("profile_hash", UNSET))

        i_message_profile_payload = cls(
            imessage_id=imessage_id,
            relationship_type=relationship_type,
            key_events=key_events,
            topics=topics,
            facts_about_other=facts_about_other,
            pattern_notes=pattern_notes,
            last_ts=last_ts,
            message_count=message_count,
            profile_hash=profile_hash,
        )

        i_message_profile_payload.additional_properties = d
        return i_message_profile_payload

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
