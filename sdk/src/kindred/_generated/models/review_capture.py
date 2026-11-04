from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from typing import cast

if TYPE_CHECKING:
    from ..models.contact_update_action import ContactUpdateAction
    from ..models.interaction_action import InteractionAction
    from ..models.life_event_action import LifeEventAction
    from ..models.note_action import NoteAction
    from ..models.reminder_action import ReminderAction


T = TypeVar("T", bound="ReviewCapture")


@_attrs_define
class ReviewCapture:
    """
    Attributes:
        revision (int):
        corrected_text (str):
        actions (list[ContactUpdateAction | InteractionAction | LifeEventAction | NoteAction | ReminderAction]):
    """

    revision: int
    corrected_text: str
    actions: list[ContactUpdateAction | InteractionAction | LifeEventAction | NoteAction | ReminderAction]

    def to_dict(self) -> dict[str, Any]:
        from ..models.contact_update_action import ContactUpdateAction
        from ..models.interaction_action import InteractionAction
        from ..models.life_event_action import LifeEventAction
        from ..models.note_action import NoteAction
        from ..models.reminder_action import ReminderAction

        revision = self.revision

        corrected_text = self.corrected_text

        actions = []
        for actions_item_data in self.actions:
            actions_item: dict[str, Any]
            if isinstance(actions_item_data, InteractionAction):
                actions_item = actions_item_data.to_dict()
            elif isinstance(actions_item_data, NoteAction):
                actions_item = actions_item_data.to_dict()
            elif isinstance(actions_item_data, ContactUpdateAction):
                actions_item = actions_item_data.to_dict()
            elif isinstance(actions_item_data, LifeEventAction):
                actions_item = actions_item_data.to_dict()
            else:
                actions_item = actions_item_data.to_dict()

            actions.append(actions_item)

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "revision": revision,
                "corrected_text": corrected_text,
                "actions": actions,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.contact_update_action import ContactUpdateAction
        from ..models.interaction_action import InteractionAction
        from ..models.life_event_action import LifeEventAction
        from ..models.note_action import NoteAction
        from ..models.reminder_action import ReminderAction

        d = dict(src_dict)
        revision = d.pop("revision")

        corrected_text = d.pop("corrected_text")

        actions = []
        _actions = d.pop("actions")
        for actions_item_data in _actions:

            def _parse_actions_item(
                data: object,
            ) -> ContactUpdateAction | InteractionAction | LifeEventAction | NoteAction | ReminderAction:
                try:
                    if not isinstance(data, dict):
                        raise TypeError()
                    actions_item_type_0 = InteractionAction.from_dict(data)

                    return actions_item_type_0
                except (TypeError, ValueError, AttributeError, KeyError):
                    pass
                try:
                    if not isinstance(data, dict):
                        raise TypeError()
                    actions_item_type_1 = NoteAction.from_dict(data)

                    return actions_item_type_1
                except (TypeError, ValueError, AttributeError, KeyError):
                    pass
                try:
                    if not isinstance(data, dict):
                        raise TypeError()
                    actions_item_type_2 = ContactUpdateAction.from_dict(data)

                    return actions_item_type_2
                except (TypeError, ValueError, AttributeError, KeyError):
                    pass
                try:
                    if not isinstance(data, dict):
                        raise TypeError()
                    actions_item_type_3 = LifeEventAction.from_dict(data)

                    return actions_item_type_3
                except (TypeError, ValueError, AttributeError, KeyError):
                    pass
                if not isinstance(data, dict):
                    raise TypeError()
                actions_item_type_4 = ReminderAction.from_dict(data)

                return actions_item_type_4

            actions_item = _parse_actions_item(actions_item_data)

            actions.append(actions_item)

        review_capture = cls(
            revision=revision,
            corrected_text=corrected_text,
            actions=actions,
        )

        return review_capture
