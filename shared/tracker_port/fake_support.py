"""Helpers of the fake adapter: corpus and state file reads, and the state and ready checks."""

from __future__ import annotations

import json
from dataclasses import replace
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from .port import AdapterError, ArgumentError
from .record import TrackerRecord, merge_refresh_envelope

CORPUS_FILES = ("program.json", "epics.json", "slices.json", "prs.json")
READY_KINDS = ("program", "epic", "slice")
LIFECYCLES = ("open", "in_progress", "closed")


def record_of_row(row: dict[str, Any]) -> TrackerRecord:
    # JSON lists become tuples, so each record holds the same types that an adapter returns.
    envelope = {
        key: tuple(value) if isinstance(value, list) else value
        for key, value in row["envelope"].items()
    }
    return TrackerRecord(
        id=row["id"],
        kind=row["kind"],
        parent=row["parent"],
        blocked_by=tuple(row["blocked_by"]),
        lifecycle=row["lifecycle"],
        assignee=row["assignee"],
        envelope=envelope,
        external_ref=row["external_ref"],
        title=row.get("title"),
        description=row.get("description"),
        acceptance_criteria=row.get("acceptance_criteria"),
        design=row.get("design"),
        tracks=tuple(row.get("tracks", ())),
    )


def load_corpus(corpus_dir: Path, name: str) -> list[TrackerRecord]:
    try:
        data = json.loads((corpus_dir / name).read_text(encoding="utf-8"))
        rows = data if isinstance(data, list) else [data]
        return [record_of_row(row) for row in rows]
    except (OSError, ValueError, KeyError, TypeError) as error:
        raise AdapterError(f"cannot read corpus file {name}: {error}") from error


def load_state(path: Path) -> tuple[list[TrackerRecord], dict[str, list[tuple[str, str]]]]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        records = [record_of_row(row) for row in data["records"]]
        notes = {key: [tuple(item) for item in items] for key, items in data["notes"].items()}
    except (OSError, ValueError, KeyError, TypeError) as error:
        raise AdapterError(f"cannot read state file {path}: {error}") from error
    return records, notes


def check_lifecycle(state: str) -> None:
    if state not in LIFECYCLES:
        raise ArgumentError(f"state must be one of {', '.join(LIFECYCLES)}, not {state}")


def now() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds")

def _blockers_closed(record: TrackerRecord, by_id: dict[str, TrackerRecord]) -> bool:
    # A missing blocker counts as not closed. A pull request never blocks (ADR-0040).
    for blocker in record.blocked_by:
        held = by_id.get(blocker)
        if held is None:
            if blocker.startswith("pr-"):
                continue
            return False
        if held.kind != "pr" and held.lifecycle != "closed":
            return False
    return True


def is_under(record: TrackerRecord, under: str | None, by_id: dict[str, TrackerRecord]) -> bool:
    # A record is under its parent and under each ancestor of the parent.
    parent = by_id.get(record.parent) if record.parent else None
    while under is not None and parent is not None and parent.id != under:
        parent = by_id.get(parent.parent) if parent.parent else None
    return under is None or parent is not None


def is_ready(record: TrackerRecord, by_id: dict[str, TrackerRecord]) -> bool:
    # The ready rule of bd: the record is open, not deferred, and each blocker is closed.
    # Each ancestor must be unblocked and not deferred, but it may be in progress.
    if record.lifecycle != "open" or "deferred" in record.envelope or not _blockers_closed(record, by_id):
        return False
    parent = by_id.get(record.parent) if record.parent else None
    while parent is not None:
        if "deferred" in parent.envelope or not _blockers_closed(parent, by_id):
            return False
        parent = by_id.get(parent.parent) if parent.parent else None
    return True


def envelope_refreshes(records: list[TrackerRecord], found: list[TrackerRecord]) -> dict[str, TrackerRecord]:
    # Merge the file envelope over the held one, so runtime keys the file lacks survive.
    current = {record.id: record for record in records}
    refreshed: dict[str, TrackerRecord] = {}
    for record in found:
        held = current.get(record.id)
        if held is None:
            continue
        envelope = merge_refresh_envelope(held.envelope, record.envelope)
        if envelope != held.envelope:
            refreshed[record.id] = replace(held, envelope=envelope)
    return refreshed
