from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast


T = TypeVar("T", bound="SearchResultItem")


@_attrs_define
class SearchResultItem:
    """A single search result with type discriminator and ranking info.

    Attributes:
        id (str):
        type_ (str):
        title (str):
        snippet (None | str | Unset):
        rank (float | None | Unset):
        created_at (None | str | Unset):
        updated_at (None | str | Unset):
    """

    id: str
    type_: str
    title: str
    snippet: None | str | Unset = UNSET
    rank: float | None | Unset = UNSET
    created_at: None | str | Unset = UNSET
    updated_at: None | str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        type_ = self.type_

        title = self.title

        snippet: None | str | Unset
        if isinstance(self.snippet, Unset):
            snippet = UNSET
        else:
            snippet = self.snippet

        rank: float | None | Unset
        if isinstance(self.rank, Unset):
            rank = UNSET
        else:
            rank = self.rank

        created_at: None | str | Unset
        if isinstance(self.created_at, Unset):
            created_at = UNSET
        else:
            created_at = self.created_at

        updated_at: None | str | Unset
        if isinstance(self.updated_at, Unset):
            updated_at = UNSET
        else:
            updated_at = self.updated_at

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "type": type_,
                "title": title,
            }
        )
        if snippet is not UNSET:
            field_dict["snippet"] = snippet
        if rank is not UNSET:
            field_dict["rank"] = rank
        if created_at is not UNSET:
            field_dict["created_at"] = created_at
        if updated_at is not UNSET:
            field_dict["updated_at"] = updated_at

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        id = d.pop("id")

        type_ = d.pop("type")

        title = d.pop("title")

        def _parse_snippet(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        snippet = _parse_snippet(d.pop("snippet", UNSET))

        def _parse_rank(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        rank = _parse_rank(d.pop("rank", UNSET))

        def _parse_created_at(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        created_at = _parse_created_at(d.pop("created_at", UNSET))

        def _parse_updated_at(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        updated_at = _parse_updated_at(d.pop("updated_at", UNSET))

        search_result_item = cls(
            id=id,
            type_=type_,
            title=title,
            snippet=snippet,
            rank=rank,
            created_at=created_at,
            updated_at=updated_at,
        )

        search_result_item.additional_properties = d
        return search_result_item

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
