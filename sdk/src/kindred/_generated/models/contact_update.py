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


T = TypeVar("T", bound="ContactUpdate")


@_attrs_define
class ContactUpdate:
    """
    Attributes:
        first_name (None | str | Unset):
        last_name (None | str | Unset):
        middle_name (None | str | Unset):
        prefix (None | str | Unset):
        suffix (None | str | Unset):
        nickname (None | str | Unset):
        company (None | str | Unset):
        department (None | str | Unset):
        title (None | str | Unset):
        birthday (datetime.date | None | Unset):
        how_we_met (None | str | Unset):
        is_favorite (bool | None | Unset):
        is_archived (bool | None | Unset):
        is_deceased (bool | None | Unset):
        deceased_at (datetime.date | None | Unset):
        contact_frequency_days (int | None | Unset):
        auto_log_email (bool | None | Unset):
        stage (None | str | Unset):
        do_not_contact (bool | None | Unset):
        do_not_contact_reason (None | str | Unset):
        pronouns (None | str | Unset):
        timezone (None | str | Unset):
        tag_ids (list[UUID] | None | Unset):
    """

    first_name: None | str | Unset = UNSET
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
    is_favorite: bool | None | Unset = UNSET
    is_archived: bool | None | Unset = UNSET
    is_deceased: bool | None | Unset = UNSET
    deceased_at: datetime.date | None | Unset = UNSET
    contact_frequency_days: int | None | Unset = UNSET
    auto_log_email: bool | None | Unset = UNSET
    stage: None | str | Unset = UNSET
    do_not_contact: bool | None | Unset = UNSET
    do_not_contact_reason: None | str | Unset = UNSET
    pronouns: None | str | Unset = UNSET
    timezone: None | str | Unset = UNSET
    tag_ids: list[UUID] | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        first_name: None | str | Unset
        if isinstance(self.first_name, Unset):
            first_name = UNSET
        else:
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

        is_favorite: bool | None | Unset
        if isinstance(self.is_favorite, Unset):
            is_favorite = UNSET
        else:
            is_favorite = self.is_favorite

        is_archived: bool | None | Unset
        if isinstance(self.is_archived, Unset):
            is_archived = UNSET
        else:
            is_archived = self.is_archived

        is_deceased: bool | None | Unset
        if isinstance(self.is_deceased, Unset):
            is_deceased = UNSET
        else:
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

        auto_log_email: bool | None | Unset
        if isinstance(self.auto_log_email, Unset):
            auto_log_email = UNSET
        else:
            auto_log_email = self.auto_log_email

        stage: None | str | Unset
        if isinstance(self.stage, Unset):
            stage = UNSET
        else:
            stage = self.stage

        do_not_contact: bool | None | Unset
        if isinstance(self.do_not_contact, Unset):
            do_not_contact = UNSET
        else:
            do_not_contact = self.do_not_contact

        do_not_contact_reason: None | str | Unset
        if isinstance(self.do_not_contact_reason, Unset):
            do_not_contact_reason = UNSET
        else:
            do_not_contact_reason = self.do_not_contact_reason

        pronouns: None | str | Unset
        if isinstance(self.pronouns, Unset):
            pronouns = UNSET
        else:
            pronouns = self.pronouns

        timezone: None | str | Unset
        if isinstance(self.timezone, Unset):
            timezone = UNSET
        else:
            timezone = self.timezone

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
        field_dict.update({})
        if first_name is not UNSET:
            field_dict["first_name"] = first_name
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
        if auto_log_email is not UNSET:
            field_dict["auto_log_email"] = auto_log_email
        if stage is not UNSET:
            field_dict["stage"] = stage
        if do_not_contact is not UNSET:
            field_dict["do_not_contact"] = do_not_contact
        if do_not_contact_reason is not UNSET:
            field_dict["do_not_contact_reason"] = do_not_contact_reason
        if pronouns is not UNSET:
            field_dict["pronouns"] = pronouns
        if timezone is not UNSET:
            field_dict["timezone"] = timezone
        if tag_ids is not UNSET:
            field_dict["tag_ids"] = tag_ids

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)

        def _parse_first_name(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        first_name = _parse_first_name(d.pop("first_name", UNSET))

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
                birthday_type_0 = datetime.date.fromisoformat(data)

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

        def _parse_is_favorite(data: object) -> bool | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(bool | None | Unset, data)

        is_favorite = _parse_is_favorite(d.pop("is_favorite", UNSET))

        def _parse_is_archived(data: object) -> bool | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(bool | None | Unset, data)

        is_archived = _parse_is_archived(d.pop("is_archived", UNSET))

        def _parse_is_deceased(data: object) -> bool | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(bool | None | Unset, data)

        is_deceased = _parse_is_deceased(d.pop("is_deceased", UNSET))

        def _parse_deceased_at(data: object) -> datetime.date | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                deceased_at_type_0 = datetime.date.fromisoformat(data)

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

        def _parse_auto_log_email(data: object) -> bool | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(bool | None | Unset, data)

        auto_log_email = _parse_auto_log_email(d.pop("auto_log_email", UNSET))

        def _parse_stage(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        stage = _parse_stage(d.pop("stage", UNSET))

        def _parse_do_not_contact(data: object) -> bool | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(bool | None | Unset, data)

        do_not_contact = _parse_do_not_contact(d.pop("do_not_contact", UNSET))

        def _parse_do_not_contact_reason(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        do_not_contact_reason = _parse_do_not_contact_reason(d.pop("do_not_contact_reason", UNSET))

        def _parse_pronouns(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        pronouns = _parse_pronouns(d.pop("pronouns", UNSET))

        def _parse_timezone(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        timezone = _parse_timezone(d.pop("timezone", UNSET))

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

        contact_update = cls(
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
            auto_log_email=auto_log_email,
            stage=stage,
            do_not_contact=do_not_contact,
            do_not_contact_reason=do_not_contact_reason,
            pronouns=pronouns,
            timezone=timezone,
            tag_ids=tag_ids,
        )

        contact_update.additional_properties = d
        return contact_update

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
