"""The trend of two whole-repository records, by key. The rules follow epic E6, step D6.

A key only in the current record is new. A key only in the previous record is fixed. A key in
both records is worse when its count fact grew, and unchanged otherwise. apply_trend reads the
previous record from a file, and it writes the trend into the current record.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def compare_findings(previous: dict[str, Any], current: dict[str, Any]) -> dict[str, str]:
    """Return the tag of each key: new, worse, unchanged, or fixed."""
    before = {item["key"]: item for item in previous.get("findings", [])}
    after = {item["key"]: item for item in current.get("findings", [])}
    tags = {key: _tag(before[key], item) if key in before else "new" for key, item in after.items()}
    tags.update({key: "fixed" for key in before if key not in after})
    return tags


def apply_trend(record: dict[str, Any], previous_path: Path) -> None:
    """Give each finding of record its trend, and the fixed keys, from the record at previous_path.

    When the previous record cannot be read, record gets one not_analysed line and no trend.
    """
    previous = read_previous(previous_path)
    if previous is None:
        note = f"not analysed: no usable previous record at {previous_path}, so no trend"
        record["not_analysed"].append(" ".join(note.split()))
        return
    tags = compare_findings(previous, record)
    for item in record["findings"]:
        item["trend"] = tags[item["key"]]
    record["fixed"] = sorted(key for key, tag in tags.items() if tag == "fixed")


def read_previous(path: Path) -> dict[str, Any] | None:
    """Return the record in the file at path, or None when the file is missing or not a record."""
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    return data if _is_record(data) else None


def _is_record(data: Any) -> bool:
    """Return True when data holds a findings list, and each finding has a key and a facts dict."""
    if not isinstance(data, dict) or not isinstance(data.get("findings"), list):
        return False
    return all(
        isinstance(item, dict) and isinstance(item.get("key"), str)
        and isinstance(item.get("facts", {}), dict)
        for item in data["findings"]
    )


def _tag(old: dict[str, Any], new: dict[str, Any]) -> str:
    """Return worse when the count fact grew, and unchanged otherwise."""
    return "worse" if _count(new) > _count(old) else "unchanged"


def _count(item: dict[str, Any]) -> int:
    """Return the count fact of one finding, or 0 when the fact is absent or not a whole number."""
    value = item.get("facts", {}).get("count", 0)
    return value if isinstance(value, int) and not isinstance(value, bool) else 0
