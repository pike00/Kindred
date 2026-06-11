from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.media_category import MediaCategory
from ..types import UNSET, Unset
from typing import cast
from uuid import UUID
import datetime


T = TypeVar("T", bound="MediaRecommendationCreate")


@_attrs_define
class MediaRecommendationCreate:
    """
    Attributes:
        category (MediaCategory):
        title (str): Title of the work.
        contact_id (UUID):
        creator (None | str | Unset): Author, director, artist, or similar creator.
        note (None | str | Unset): Why it was recommended or personal reaction.
        recommended_at (datetime.date | None | Unset): Date the recommendation was made.
    """

    category: MediaCategory
    title: str
    contact_id: UUID
    creator: None | str | Unset = UNSET
    note: None | str | Unset = UNSET
    recommended_at: datetime.date | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        category = self.category.value

        title = self.title

        contact_id = str(self.contact_id)

        creator: None | str | Unset
        if isinstance(self.creator, Unset):
            creator = UNSET
        else:
            creator = self.creator

        note: None | str | Unset
        if isinstance(self.note, Unset):
            note = UNSET
        else:
            note = self.note

        recommended_at: None | str | Unset
        if isinstance(self.recommended_at, Unset):
            recommended_at = UNSET
        elif isinstance(self.recommended_at, datetime.date):
            recommended_at = self.recommended_at.isoformat()
        else:
            recommended_at = self.recommended_at

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "category": category,
                "title": title,
                "contact_id": contact_id,
            }
        )
        if creator is not UNSET:
            field_dict["creator"] = creator
        if note is not UNSET:
            field_dict["note"] = note
        if recommended_at is not UNSET:
            field_dict["recommended_at"] = recommended_at

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        category = MediaCategory(d.pop("category"))

        title = d.pop("title")

        contact_id = UUID(d.pop("contact_id"))

        def _parse_creator(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        creator = _parse_creator(d.pop("creator", UNSET))

        def _parse_note(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        note = _parse_note(d.pop("note", UNSET))

        def _parse_recommended_at(data: object) -> datetime.date | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                recommended_at_type_0 = datetime.date.fromisoformat(data)

                return recommended_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.date | None | Unset, data)

        recommended_at = _parse_recommended_at(d.pop("recommended_at", UNSET))

        media_recommendation_create = cls(
            category=category,
            title=title,
            contact_id=contact_id,
            creator=creator,
            note=note,
            recommended_at=recommended_at,
        )

        media_recommendation_create.additional_properties = d
        return media_recommendation_create

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
