from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast
from typing import Literal, cast
from uuid import UUID

if TYPE_CHECKING:
    from ..models.birthday_field_change import BirthdayFieldChange
    from ..models.text_contact_field_change import TextContactFieldChange


T = TypeVar("T", bound="ContactUpdateAction")


@_attrs_define
class ContactUpdateAction:
    """
    Attributes:
        id (UUID):
        kind (Literal['contact_update']):
        evidence (str):
        fields (list[BirthdayFieldChange | TextContactFieldChange]):
        enabled (bool | Unset):  Default: True.
        review_warning (None | str | Unset):
        contact_id (None | Unset | UUID):
    """

    id: UUID
    kind: Literal["contact_update"]
    evidence: str
    fields: list[BirthdayFieldChange | TextContactFieldChange]
    enabled: bool | Unset = True
    review_warning: None | str | Unset = UNSET
    contact_id: None | Unset | UUID = UNSET

    def to_dict(self) -> dict[str, Any]:
        from ..models.birthday_field_change import BirthdayFieldChange
        from ..models.text_contact_field_change import TextContactFieldChange

        id = str(self.id)

        kind = self.kind

        evidence = self.evidence

        fields = []
        for fields_item_data in self.fields:
            fields_item: dict[str, Any]
            if isinstance(fields_item_data, TextContactFieldChange):
                fields_item = fields_item_data.to_dict()
            else:
                fields_item = fields_item_data.to_dict()

            fields.append(fields_item)

        enabled = self.enabled

        review_warning: None | str | Unset
        if isinstance(self.review_warning, Unset):
            review_warning = UNSET
        else:
            review_warning = self.review_warning

        contact_id: None | str | Unset
        if isinstance(self.contact_id, Unset):
            contact_id = UNSET
        elif isinstance(self.contact_id, UUID):
            contact_id = str(self.contact_id)
        else:
            contact_id = self.contact_id

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "id": id,
                "kind": kind,
                "evidence": evidence,
                "fields": fields,
            }
        )
        if enabled is not UNSET:
            field_dict["enabled"] = enabled
        if review_warning is not UNSET:
            field_dict["review_warning"] = review_warning
        if contact_id is not UNSET:
            field_dict["contact_id"] = contact_id

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.birthday_field_change import BirthdayFieldChange
        from ..models.text_contact_field_change import TextContactFieldChange

        d = dict(src_dict)
        id = UUID(d.pop("id"))

        kind = cast(Literal["contact_update"], d.pop("kind"))
        if kind != "contact_update":
            raise ValueError(f"kind must match const 'contact_update', got '{kind}'")

        evidence = d.pop("evidence")

        fields = []
        _fields = d.pop("fields")
        for fields_item_data in _fields:

            def _parse_fields_item(data: object) -> BirthdayFieldChange | TextContactFieldChange:
                try:
                    if not isinstance(data, dict):
                        raise TypeError()
                    fields_item_type_0 = TextContactFieldChange.from_dict(data)

                    return fields_item_type_0
                except (TypeError, ValueError, AttributeError, KeyError):
                    pass
                if not isinstance(data, dict):
                    raise TypeError()
                fields_item_type_1 = BirthdayFieldChange.from_dict(data)

                return fields_item_type_1

            fields_item = _parse_fields_item(fields_item_data)

            fields.append(fields_item)

        enabled = d.pop("enabled", UNSET)

        def _parse_review_warning(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        review_warning = _parse_review_warning(d.pop("review_warning", UNSET))

        def _parse_contact_id(data: object) -> None | Unset | UUID:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                contact_id_type_0 = UUID(data)

                return contact_id_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | Unset | UUID, data)

        contact_id = _parse_contact_id(d.pop("contact_id", UNSET))

        contact_update_action = cls(
            id=id,
            kind=kind,
            evidence=evidence,
            fields=fields,
            enabled=enabled,
            review_warning=review_warning,
            contact_id=contact_id,
        )

        return contact_update_action
