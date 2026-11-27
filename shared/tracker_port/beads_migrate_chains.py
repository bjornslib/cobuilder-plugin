"""Build and apply the hierarchy edges required by native beads mapping."""

from __future__ import annotations

from pathlib import Path
from typing import Any


def _chain_entry(id: str, detail: str) -> dict[str, str]:
    return {"id": id, "change": "chain", "detail": detail}


def _order_value(row: dict[str, Any], kind: str) -> tuple[int, str]:
    envelope = row["metadata"]["cb"].get("envelope") or {}
    value = envelope.get("epic_id", "E0") if kind == "epic" else envelope.get("n", 0)
    try:
        return int(str(value).lstrip("E")), row["id"]
    except ValueError:
        return 0, row["id"]


def _derived_chains(rows: list[dict[str, Any]]) -> list[tuple[str, str]]:
    groups: dict[tuple[str, str | None], list[dict[str, Any]]] = {}
    for row in rows:
        kind = row["metadata"]["cb"]["kind"]
        if kind in ("epic", "slice"):
            groups.setdefault((kind, row.get("parent")), []).append(row)
    result = []
    for (kind, _parent), group in groups.items():
        ordered = sorted(group, key=lambda row: _order_value(row, kind))
        result.extend(
            (later["metadata"]["cb"]["id"], earlier["metadata"]["cb"]["id"])
            for earlier, later in zip(ordered, ordered[1:])
        )
    return result


def _expected_chains(
    rows: list[dict[str, Any]], records: dict[str, Any], by_cb: dict[str, dict[str, Any]]
) -> list[tuple[str, str]]:
    if not records:
        return _derived_chains(rows)
    return [
        (record.id, parent)
        for record in records.values()
        if record.id in by_cb
        for parent in record.blocked_by
        if parent in by_cb
    ]


def chain_updates(
    rows: list[dict[str, Any]], records: dict[str, Any], by_cb: dict[str, dict[str, Any]], plans_dir: Path | None
) -> tuple[list[list[str]], list[dict[str, str]], list[dict[str, str]]]:
    operations: list[list[str]] = []
    changes: list[dict[str, str]] = []
    missing: list[dict[str, str]] = []
    for later, earlier in _expected_chains(rows, records, by_cb):
        row, parent = by_cb[later], by_cb[earlier]
        held = any(dep.get("depends_on_id") == parent["id"] and dep.get("type") == "blocks" for dep in row.get("dependencies") or [])
        if held:
            continue
        if plans_dir is None:
            missing.append({"id": later, "detail": f"lacks the edge to {earlier}"})
            continue
        operations.append(["dep", "add", row["id"], parent["id"]])
        changes.append(_chain_entry(later, f"blocked by {earlier}"))
    return operations, changes, missing
