from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.contact_source import ContactSource
from ..types import UNSET, Unset
from dateutil.parser import isoparse
from typing import cast
from uuid import UUID
import datetime


T = TypeVar("T", bound="ContactCreate")


@_attrs_define
class ContactCreate:
    """
    Attributes:
        first_name (str): Given name; required.
        last_name (None | str | Unset): Family name.
        middle_name (None | str | Unset): Middle name or initial.
        prefix (None | str | Unset): Honorific like Dr., Mr., Ms.
        suffix (None | str | Unset): Suffix like Jr., PhD.
        nickname (None | str | Unset): Preferred or informal name.
        company (None | str | Unset): Organization name.
        department (None | str | Unset): Department within the company.
        title (None | str | Unset): Job title.
        birthday (datetime.date | None | Unset): Date of birth; used for milestone and birthday reminders.
        how_we_met (None | str | Unset): Short story of how the introduction happened.
        is_favorite (bool | Unset): Pinned to the top of contact lists. Default: False.
        is_archived (bool | Unset): Soft-deleted; excluded from default lists. Default: False.
        is_deceased (bool | Unset): Marks the contact as deceased. Default: False.
        deceased_at (datetime.date | None | Unset): Date the contact passed away.
        contact_frequency_days (int | None | Unset): Target days between interactions; drives losing-touch cadence.
        do_not_contact (bool | Unset): If True, suppress all contact reminders and actions for this contact. Default:
            False.
        do_not_contact_reason (None | str | Unset): Optional reason why the contact was marked do-not-contact.
        stage (None | str | Unset): Kanban stage like Active, Dormant, Lost.
        source (ContactSource | Unset):
        source_external_id (None | str | Unset): Opaque external ID for idempotent upserts from integrations.
        tag_ids (list[UUID] | None | Unset):
    """

    first_name: str
    last_name: None | str | Unset = UNSET
    middle_name: None | str | Unset = UNSET
    prefix: None | str | Unset = UNSET
    suffix: None | str | Unset = UNSET
    nickname: None | str | Unset = UNSET
    company: None | str | Unset = UNSET
    department: None | str | Unset = UNSET
    title: None | str | Unset = UNSET
    birthday: datetime.date | None | Unset = UNSET
    how_we_met: None | str | Unset = UNSET
    is_favorite: bool | Unset = False
    is_archived: bool | Unset = False
    is_deceased: bool | Unset = False
    deceased_at: datetime.date | None | Unset = UNSET
    contact_frequency_days: int | None | Unset = UNSET
    do_not_contact: bool | Unset = False
    do_not_contact_reason: None | str | Unset = UNSET
    stage: None | str | Unset = UNSET
    source: ContactSource | Unset = UNSET
    source_external_id: None | str | Unset = UNSET
    tag_ids: list[UUID] | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        first_name = self.first_name

        last_name: None | str | Unset
        if isinstance(self.last_name, Unset):
            last_name = UNSET
        else:
            last_name = self.last_name

        middle_name: None | str | Unset
        if isinstance(self.middle_name, Unset):
            middle_name = UNSET
        else:
            middle_name = self.middle_name

        prefix: None | str | Unset
        if isinstance(self.prefix, Unset):
            prefix = UNSET
        else:
            prefix = self.prefix

        suffix: None | str | Unset
        if isinstance(self.suffix, Unset):
            suffix = UNSET
        else:
            suffix = self.suffix

        nickname: None | str | Unset
        if isinstance(self.nickname, Unset):
            nickname = UNSET
        else:
            nickname = self.nickname

        company: None | str | Unset
        if isinstance(self.company, Unset):
            company = UNSET
        else:
            company = self.company

        department: None | str | Unset
        if isinstance(self.department, Unset):
            department = UNSET
        else:
            department = self.department

        title: None | str | Unset
        if isinstance(self.title, Unset):
            title = UNSET
        else:
            title = self.title

        birthday: None | str | Unset
        if isinstance(self.birthday, Unset):
            birthday = UNSET
        elif isinstance(self.birthday, datetime.date):
            birthday = self.birthday.isoformat()
        else:
            birthday = self.birthday

        how_we_met: None | str | Unset
        if isinstance(self.how_we_met, Unset):
            how_we_met = UNSET
        else:
            how_we_met = self.how_we_met

        is_favorite = self.is_favorite

        is_archived = self.is_archived

        is_deceased = self.is_deceased

        deceased_at: None | str | Unset
        if isinstance(self.deceased_at, Unset):
            deceased_at = UNSET
        elif isinstance(self.deceased_at, datetime.date):
            deceased_at = self.deceased_at.isoformat()
        else:
            deceased_at = self.deceased_at

        contact_frequency_days: int | None | Unset
        if isinstance(self.contact_frequency_days, Unset):
            contact_frequency_days = UNSET
        else:
            contact_frequency_days = self.contact_frequency_days

        do_not_contact = self.do_not_contact

        do_not_contact_reason: None | str | Unset
        if isinstance(self.do_not_contact_reason, Unset):
            do_not_contact_reason = UNSET
        else:
            do_not_contact_reason = self.do_not_contact_reason

        stage: None | str | Unset
        if isinstance(self.stage, Unset):
            stage = UNSET
        else:
            stage = self.stage

        source: str | Unset = UNSET
        if not isinstance(self.source, Unset):
            source = self.source.value

        source_external_id: None | str | Unset
        if isinstance(self.source_external_id, Unset):
            source_external_id = UNSET
        else:
            source_external_id = self.source_external_id

        tag_ids: list[str] | None | Unset
        if isinstance(self.tag_ids, Unset):
            tag_ids = UNSET
        elif isinstance(self.tag_ids, list):
            tag_ids = []
            for tag_ids_type_0_item_data in self.tag_ids:
                tag_ids_type_0_item = str(tag_ids_type_0_item_data)
                tag_ids.append(tag_ids_type_0_item)

        else:
            tag_ids = self.tag_ids

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "first_name": first_name,
            }
        )
        if last_name is not UNSET:
            field_dict["last_name"] = last_name
        if middle_name is not UNSET:
            field_dict["middle_name"] = middle_name
        if prefix is not UNSET:
            field_dict["prefix"] = prefix
        if suffix is not UNSET:
            field_dict["suffix"] = suffix
        if nickname is not UNSET:
            field_dict["nickname"] = nickname
        if company is not UNSET:
            field_dict["company"] = company
        if department is not UNSET:
            field_dict["department"] = department
        if title is not UNSET:
            field_dict["title"] = title
        if birthday is not UNSET:
            field_dict["birthday"] = birthday
        if how_we_met is not UNSET:
            field_dict["how_we_met"] = how_we_met
        if is_favorite is not UNSET:
            field_dict["is_favorite"] = is_favorite
        if is_archived is not UNSET:
            field_dict["is_archived"] = is_archived
        if is_deceased is not UNSET:
            field_dict["is_deceased"] = is_deceased
        if deceased_at is not UNSET:
            field_dict["deceased_at"] = deceased_at
        if contact_frequency_days is not UNSET:
            field_dict["contact_frequency_days"] = contact_frequency_days
        if do_not_contact is not UNSET:
            field_dict["do_not_contact"] = do_not_contact
        if do_not_contact_reason is not UNSET:
            field_dict["do_not_contact_reason"] = do_not_contact_reason
        if stage is not UNSET:
            field_dict["stage"] = stage
        if source is not UNSET:
            field_dict["source"] = source
        if source_external_id is not UNSET:
            field_dict["source_external_id"] = source_external_id
        if tag_ids is not UNSET:
            field_dict["tag_ids"] = tag_ids

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        first_name = d.pop("first_name")

        def _parse_last_name(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        last_name = _parse_last_name(d.pop("last_name", UNSET))

        def _parse_middle_name(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        middle_name = _parse_middle_name(d.pop("middle_name", UNSET))

        def _parse_prefix(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        prefix = _parse_prefix(d.pop("prefix", UNSET))

        def _parse_suffix(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        suffix = _parse_suffix(d.pop("suffix", UNSET))

        def _parse_nickname(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        nickname = _parse_nickname(d.pop("nickname", UNSET))

        def _parse_company(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        company = _parse_company(d.pop("company", UNSET))

        def _parse_department(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        department = _parse_department(d.pop("department", UNSET))

        def _parse_title(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        title = _parse_title(d.pop("title", UNSET))

        def _parse_birthday(data: object) -> datetime.date | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                birthday_type_0 = isoparse(data).date()

                return birthday_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.date | None | Unset, data)

        birthday = _parse_birthday(d.pop("birthday", UNSET))

        def _parse_how_we_met(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        how_we_met = _parse_how_we_met(d.pop("how_we_met", UNSET))

        is_favorite = d.pop("is_favorite", UNSET)

        is_archived = d.pop("is_archived", UNSET)

        is_deceased = d.pop("is_deceased", UNSET)

        def _parse_deceased_at(data: object) -> datetime.date | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                deceased_at_type_0 = isoparse(data).date()

                return deceased_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.date | None | Unset, data)

        deceased_at = _parse_deceased_at(d.pop("deceased_at", UNSET))

        def _parse_contact_frequency_days(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        contact_frequency_days = _parse_contact_frequency_days(d.pop("contact_frequency_days", UNSET))

        do_not_contact = d.pop("do_not_contact", UNSET)

        def _parse_do_not_contact_reason(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        do_not_contact_reason = _parse_do_not_contact_reason(d.pop("do_not_contact_reason", UNSET))

        def _parse_stage(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        stage = _parse_stage(d.pop("stage", UNSET))

        _source = d.pop("source", UNSET)
        source: ContactSource | Unset
        if isinstance(_source, Unset):
            source = UNSET
        else:
            source = ContactSource(_source)

        def _parse_source_external_id(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        source_external_id = _parse_source_external_id(d.pop("source_external_id", UNSET))

        def _parse_tag_ids(data: object) -> list[UUID] | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, list):
                    raise TypeError()
                tag_ids_type_0 = []
                _tag_ids_type_0 = data
                for tag_ids_type_0_item_data in _tag_ids_type_0:
                    tag_ids_type_0_item = UUID(tag_ids_type_0_item_data)

                    tag_ids_type_0.append(tag_ids_type_0_item)

                return tag_ids_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(list[UUID] | None | Unset, data)

        tag_ids = _parse_tag_ids(d.pop("tag_ids", UNSET))

        contact_create = cls(
            first_name=first_name,
            last_name=last_name,
            middle_name=middle_name,
            prefix=prefix,
            suffix=suffix,
            nickname=nickname,
            company=company,
            department=department,
            title=title,
            birthday=birthday,
            how_we_met=how_we_met,
            is_favorite=is_favorite,
            is_archived=is_archived,
            is_deceased=is_deceased,
            deceased_at=deceased_at,
            contact_frequency_days=contact_frequency_days,
            do_not_contact=do_not_contact,
            do_not_contact_reason=do_not_contact_reason,
            stage=stage,
            source=source,
            source_external_id=source_external_id,
            tag_ids=tag_ids,
        )

        contact_create.additional_properties = d
        return contact_create

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
