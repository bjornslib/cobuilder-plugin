"""Turns a list of TrackerRecord into the index shape: entities and joins."""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from .record import TrackerRecord


def _plain(value: Any) -> Any:
    # JSON has no tuple, so a tuple envelope value becomes a list.
    if isinstance(value, tuple):
        return list(value)
    return value


def project(records: Sequence[TrackerRecord]) -> dict[str, Any]:
    entities: dict[str, dict[str, Any]] = {}
    joins: list[list[str]] = []
    for record in records:
        entities[record.id] = {
            "id": record.id,
            "kind": record.kind,
            "parent": record.parent,
            "blocked_by": list(record.blocked_by),
            "lifecycle": record.lifecycle,
            "assignee": record.assignee,
            "envelope": {key: _plain(value) for key, value in record.envelope.items()},
            "external_ref": record.external_ref,
        }
        if record.parent is not None:
            joins.append([record.id, record.parent, "parent"])
        joins.extend([record.id, blocker, "blocked_by"] for blocker in record.blocked_by)
    return {"entities": entities, "joins": sorted(joins)}
