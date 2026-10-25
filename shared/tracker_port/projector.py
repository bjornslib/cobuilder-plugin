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
        if record.kind == "pr":
            entities[record.id]["tracks"] = list(record.tracks)
            joins.extend([record.id, epic, "tracks"] for epic in record.tracks)
        if record.parent is not None:
            joins.append([record.id, record.parent, "parent"])
        joins.extend([record.id, blocker, "blocked_by"] for blocker in record.blocked_by)
    return {"entities": entities, "joins": sorted(joins)}


def _score_text(score: float | None) -> str:
    # Two decimals when the score has no more, else the shortest exact form. No score reads as an em dash.
    if score is None:
        return "\u2014"
    if round(score, 2) == score:
        return f"{score:.2f}"
    return repr(score)


def slice_entities(records: Sequence[TrackerRecord]) -> list[dict[str, Any]]:
    # The build index shape of each slice, read from its envelope and lifecycle.
    entities: list[dict[str, Any]] = []
    for record in records:
        if record.kind != "slice":
            continue
        envelope = record.envelope
        score = envelope.get("score")
        # A closed slice with no score reads as 1.00, as the checkbox reader did before.
        if score is None and record.lifecycle == "closed":
            score = 1.0
        entities.append(
            {
                "id": record.id,
                "feature": envelope["feature"],
                "n": envelope["n"],
                "title": envelope["title"],
                "ends_with": envelope["ends_with"],
                "score": _score_text(score),
                "attempts": envelope.get("attempts", 1 if record.lifecycle == "closed" else 0),
                "state": {"closed": "completed", "in_progress": "in_progress"}.get(record.lifecycle, "planned"),
            }
        )
    # A tracker lists records in its own order. The index lists plan folder, then slice number.
    return sorted(entities, key=lambda entity: (entity["feature"], entity["n"]))
