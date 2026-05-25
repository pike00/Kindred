"""Safe JSON-to-SQL query compiler for SavedFilter.filter_json.

Converts validated filter_json conditions into parameterized SQLAlchemy filters
without any string interpolation. Only allowlisted fields and operators are
permitted; everything is validated at parse time by the Pydantic schemas and
the _validate_filter_json helper in the saved_filters route.
"""

from datetime import date, datetime
from typing import Any

from sqlalchemy import and_, or_
from sqlalchemy.orm import InstrumentedAttribute
from sqlmodel import select

from app.models import Contact

# ---------------------------------------------------------------------------
# Field → SQLAlchemy column mapping
# ---------------------------------------------------------------------------

# Only columns explicitly allowlisted in the saved_filters route may be used
# in filter_json conditions.  This dict maps string field names to the actual
# ORM column objects so we never do any dynamic attribute access on user
# input.
_FIELD_MAP: dict[str, InstrumentedAttribute[Any]] = {
    "first_name": Contact.first_name,
    "last_name": Contact.last_name,
    "company": Contact.company,
    "stage": Contact.stage,
    "is_favorite": Contact.is_favorite,
    "is_archived": Contact.is_archived,
    "birthday": Contact.birthday,
    "contact_frequency_days": Contact.contact_frequency_days,
    "last_contacted_at": Contact.last_contacted_at,
    "created_at": Contact.created_at,
}

# ---------------------------------------------------------------------------
# Operator implementations
# ---------------------------------------------------------------------------

# Each handler receives (column, value) and returns a SQLAlchemy filter clause.
# Handlers are type-aware and only accept values that make sense for the operator.


def _op_equals(col: InstrumentedAttribute[Any], value: Any) -> Any:
    return col == value


def _op_contains(col: InstrumentedAttribute[Any], value: Any) -> Any:
    """Case-insensitive substring match (strings only)."""
    if not isinstance(value, str):
        raise ValueError("'contains' operator requires a string value")
    return col.ilike(f"%{value}%")


def _op_in(col: InstrumentedAttribute[Any], value: Any) -> Any:
    """SQL IN (list membership)."""
    if not isinstance(value, (list, tuple)):
        raise ValueError("'in' operator requires a list value")
    return col.in_(value)


def _op_gt(col: InstrumentedAttribute[Any], value: Any) -> Any:
    return col > value


def _op_gte(col: InstrumentedAttribute[Any], value: Any) -> Any:
    return col >= value


def _op_lt(col: InstrumentedAttribute[Any], value: Any) -> Any:
    return col < value


def _op_lte(col: InstrumentedAttribute[Any], value: Any) -> Any:
    return col <= value


def _op_before(col: InstrumentedAttribute[Any], value: Any) -> Any:
    """Date/time before given value."""
    return col < _coerce_date(value)


def _op_after(col: InstrumentedAttribute[Any], value: Any) -> Any:
    """Date/time after given value."""
    return col > _coerce_date(value)


def _op_is(col: InstrumentedAttribute[Any], value: Any) -> Any:
    """Boolean equality (explicit alias for clarity)."""
    if not isinstance(value, bool):
        raise ValueError("'is' operator requires a boolean value")
    return col.is_(value)


# Lookup table: operator string → handler function
_OPERATOR_HANDLERS: dict[str, Any] = {
    "equals": _op_equals,
    "contains": _op_contains,
    "in": _op_in,
    "gt": _op_gt,
    "gte": _op_gte,
    "lt": _op_lt,
    "lte": _op_lte,
    "before": _op_before,
    "after": _op_after,
    "is": _op_is,
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _coerce_date(value: Any) -> date | datetime:
    """Accept date, datetime, or ISO-8601 string; return date/datetime."""
    if isinstance(value, (date, datetime)):
        return value
    if isinstance(value, str):
        # Try datetime first (ISO-8601), fall back to date
        for _fmt in (
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%dT%H:%M:%S.%f",
            "%Y-%m-%dT%H:%M:%S%z",
            "%Y-%m-%d",
        ):
            try:
                return datetime.fromisoformat(value)
            except (ValueError, TypeError):
                continue

        raise ValueError(f"Cannot parse date value: {value!r}")
    raise ValueError(f"Expected date/datetime/str, got {type(value)}")


def _build_condition_clause(condition: dict[str, Any]) -> Any:
    """Convert a single FilterCondition dict into a SQLAlchemy clause.

    Raises ValueError on invalid operator or value.
    """
    field: str = condition["field"]
    operator: str = condition["operator"]
    value = condition["value"]

    col = _FIELD_MAP.get(field)
    if col is None:
        # Should have been caught by _validate_filter_json, but be safe
        raise ValueError(f"Field '{field}' is not allowed")

    handler = _OPERATOR_HANDLERS.get(operator)
    if handler is None:
        raise ValueError(f"Operator '{operator}' is not allowed")

    return handler(col, value)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def apply_filter_json(
    statement: Any,
    filter_json: dict[str, Any],
) -> Any:
    """Apply a validated ``filter_json`` to a SQLAlchemy select/query.

    Parameters
    ----------
    statement:
        A SQLAlchemy ``select()`` (or similar) targeting :class:`Contact`.
    filter_json:
        Validated filter JSON with keys ``conditions`` (list) and ``op``
        (``"and"`` or ``"or"``).

    Returns
    -------
    The modified statement with WHERE clauses applied.
    """
    conditions = filter_json.get("conditions", [])
    if not conditions:
        return statement

    op = filter_json.get("op", "and")
    clauses = [_build_condition_clause(c) for c in conditions]

    if op == "or":
        return statement.where(or_(*clauses))
    # default: "and"
    return statement.where(and_(*clauses))


def filter_json_to_statement(
    filter_json: dict[str, Any],
) -> Any:
    """Build a full ``select(Contact)`` from ``filter_json``.

    Convenience wrapper used when you want a standalone filtered query
    without starting from an existing statement.
    """
    stmt = select(Contact)
    return apply_filter_json(stmt, filter_json)
