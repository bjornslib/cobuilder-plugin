"""The beads adapter. Reads the tracker through `bd list --json --all` and maps each row to a TrackerRecord.

Only this module and bd_runner.py may call bd. Slice 6 implements the reads. Writes arrive in slice 7.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .port import AdapterError, ArgumentError
from .record import Capabilities, Kind, TrackerRecord

CB_VERSION = 1
KINDS = ("program", "epic", "slice", "pr")
READY_KINDS = ("program", "epic", "slice")
STATUS_MAP = {"open": "open", "in_progress": "in_progress", "hooked": "in_progress", "closed": "closed"}
LIST_ARGS = ["list", "--json", "--all"]
NOT_YET = "not implemented in slice 6"


def _cb_block(row: dict[str, Any]) -> dict[str, Any]:
    """Return metadata.cb after it passes the version and kind checks."""
    issue_id = row.get("id")
    cb = (row.get("metadata") or {}).get("cb")
    if not isinstance(cb, dict):
        raise AdapterError(f"bd issue {issue_id} has no metadata.cb block")
    if cb.get("v") != CB_VERSION:
        raise AdapterError(
            f"bd issue {issue_id} has metadata.cb.v = {cb.get('v')!r}; this adapter reads v{CB_VERSION}"
        )
    if cb.get("kind") not in KINDS:
        raise AdapterError(f"bd issue {issue_id} has unknown metadata.cb.kind {cb.get('kind')!r}")
    return cb


def _envelope(cb: dict[str, Any]) -> dict[str, Any]:
    # List values become tuples, to match the fake adapter's records.
    return {key: tuple(value) if isinstance(value, list) else value for key, value in (cb.get("envelope") or {}).items()}


def _open_unblocked(record: TrackerRecord, records: dict[str, TrackerRecord]) -> bool:
    if record.lifecycle != "open" or "deferred" in record.envelope:
        return False
    for blocker_id in record.blocked_by:
        blocker = records.get(blocker_id)
        if blocker is None or blocker.lifecycle != "closed":
            return False
    return True


def _is_ready(record: TrackerRecord, records: dict[str, TrackerRecord]) -> bool:
    if not _open_unblocked(record, records):
        return False
    parent = records.get(record.parent) if record.parent else None
    if record.kind == "epic" and parent is not None:
        # An epic is ready when its program is open and unblocked.
        return _open_unblocked(parent, records)
    if record.kind == "slice" and parent is not None:
        # A slice is ready when its epic is not deferred. A PR never blocks a slice directly.
        return "deferred" not in parent.envelope
    return True


class BeadsAdapter:
    name = "beads"
    # Readiness comes from blocked_by, not from bd. bd update has no atomic claim.
    capabilities = Capabilities(native_ready=False, atomic_claim=False, rich_envelope=True, offline_read=True)

    def __init__(self, runner: Any) -> None:
        self.runner = runner

    def _records(self) -> dict[str, TrackerRecord]:
        rows = json.loads(self.runner.run(LIST_ARGS))
        cbs = {row["id"]: _cb_block(row) for row in rows}
        to_cb_id = {bd_id: cb["id"] for bd_id, cb in cbs.items()}
        records: dict[str, TrackerRecord] = {}
        for row in rows:
            cb = cbs[row["id"]]
            status = row.get("status")
            if status not in STATUS_MAP:
                raise AdapterError(f"bd issue {row['id']} has unknown status {status!r}")
            blocked_by = tuple(
                self._cb_id(to_cb_id, dep["depends_on_id"], row["id"])
                for dep in row.get("dependencies") or []
                if dep.get("type") == "blocks"
            )
            parent = self._cb_id(to_cb_id, row["parent"], row["id"]) if row.get("parent") else None
            record = TrackerRecord(
                id=cb["id"],
                kind=cb["kind"],
                parent=parent,
                blocked_by=blocked_by,
                lifecycle=STATUS_MAP[status],
                assignee=row.get("assignee"),
                envelope=_envelope(cb),
                external_ref=row.get("external_ref"),
            )
            records[record.id] = record
        return records

    @staticmethod
    def _cb_id(to_cb_id: dict[str, str], bd_id: str, from_id: str) -> str:
        if bd_id not in to_cb_id:
            raise AdapterError(f"bd issue {from_id} refers to {bd_id}, which bd did not list")
        return to_cb_id[bd_id]

    def _of_kind(self, kind: Kind, parent: str | None = None) -> list[TrackerRecord]:
        matches = [r for r in self._records().values() if r.kind == kind and (parent is None or r.parent == parent)]
        return sorted(matches, key=lambda record: record.id)

    def list_programs(self) -> list[TrackerRecord]:
        return self._of_kind("program")

    def list_epics(self, program: str | None = None) -> list[TrackerRecord]:
        return self._of_kind("epic", program)

    def list_slices(self, epic: str | None = None) -> list[TrackerRecord]:
        return self._of_kind("slice", epic)

    def list_pull_requests(self) -> list[TrackerRecord]:
        return self._of_kind("pr")

    def get_slice(self, id: str) -> TrackerRecord:
        record = self._records().get(id)
        if record is None or record.kind != "slice":
            raise ArgumentError(f"no slice with id {id}")
        return record

    def next_ready(self, kind: str = "slice", under: str | None = None) -> list[TrackerRecord]:
        if kind not in READY_KINDS:
            raise ArgumentError(f"kind must be one of {READY_KINDS}, not {kind!r}")
        records = self._records()
        candidates = [r for r in records.values() if r.kind == kind and (under is None or r.parent == under)]
        return sorted((r for r in candidates if _is_ready(r, records)), key=lambda record: record.id)

    def sync(self) -> None:
        raise AdapterError(NOT_YET)

    def claim_slice(self, id: str, claimant: str) -> TrackerRecord:
        raise AdapterError(NOT_YET)

    def set_program_stage(self, program: str, stage: str) -> TrackerRecord:
        raise AdapterError(NOT_YET)

    def set_gate_value(self, program: str, gate: str, value: str) -> TrackerRecord:
        raise AdapterError(NOT_YET)

    def set_epic_state(self, epic: str, state: str, branch: str | None = None) -> TrackerRecord:
        raise AdapterError(NOT_YET)

    def set_slice_state(
        self,
        id: str,
        state: str,
        score: float | None = None,
        attempts: int | None = None,
    ) -> TrackerRecord:
        raise AdapterError(NOT_YET)

    def record_attempt(self, id: str, score: float, note: str | None = None) -> TrackerRecord:
        raise AdapterError(NOT_YET)

    def add_note(self, id: str, text: str) -> None:
        raise AdapterError(NOT_YET)

    def escalate(self, id: str, score: float, reason: str) -> TrackerRecord:
        raise AdapterError(NOT_YET)

    def open_pull_request(self, ref: str, epic_ids: list[str]) -> TrackerRecord:
        raise AdapterError(NOT_YET)

    def set_pull_request_state(self, ref: str, merged: bool) -> TrackerRecord:
        raise AdapterError(NOT_YET)

    def seed_from_files(self, plans_dir: Path, dry_run: bool = False) -> list[TrackerRecord]:
        raise AdapterError(NOT_YET)
