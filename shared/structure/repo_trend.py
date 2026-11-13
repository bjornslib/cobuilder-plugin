"""The trend of two whole-repository records, by key. The rules follow epic E6, step D6.

A key only in the current record is new. A key only in the previous record is fixed. A key in
both records is worse when its count fact grew, and unchanged otherwise.
"""
from __future__ import annotations

from typing import Any


def compare_findings(previous: dict[str, Any], current: dict[str, Any]) -> dict[str, str]:
    """Return the tag of each key: new, worse, unchanged, or fixed."""
    before = {item["key"]: item for item in previous.get("findings", [])}
    after = {item["key"]: item for item in current.get("findings", [])}
    tags = {key: _tag(before[key], item) if key in before else "new" for key, item in after.items()}
    tags.update({key: "fixed" for key in before if key not in after})
    return tags


def _tag(old: dict[str, Any], new: dict[str, Any]) -> str:
    """Return worse when the count fact grew, and unchanged otherwise."""
    return "worse" if _count(new) > _count(old) else "unchanged"


def _count(item: dict[str, Any]) -> int:
    """Return the count fact of one finding, or 0 when the fact is absent or not a whole number."""
    value = item.get("facts", {}).get("count", 0)
    return value if isinstance(value, int) and not isinstance(value, bool) else 0
