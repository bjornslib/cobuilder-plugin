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

def is_ready(record: TrackerRecord, by_id: dict[str, TrackerRecord]) -> bool:
    # ADR-0040 ready rule, as the epic design states it for slice 1: open, not deferred,
    # and every blocker closed. A missing blocker counts as not closed.
    if record.lifecycle != "open" or "deferred" in record.envelope:
        return False
    return all(
        blocker in by_id and by_id[blocker].lifecycle == "closed"
        for blocker in record.blocked_by
    )


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
