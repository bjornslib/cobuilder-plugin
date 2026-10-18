"""The beads adapter. Reads the tracker through `bd list --json --all` and maps each row to a TrackerRecord.

Only this module and bd_runner.py may call bd. Slice 6 implements the reads. Slice 7 adds the writes.
Seeding creates the records that the list does not hold.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from .bd_runner import BdError
from .files import FilesAdapter
from .port import AdapterError, ArgumentError
from .record import Capabilities, Kind, TrackerRecord

CB_VERSION = 1
KINDS = ("program", "epic", "slice", "pr")
READY_KINDS = ("program", "epic", "slice")
STATUS_MAP = {"open": "open", "in_progress": "in_progress", "hooked": "in_progress", "closed": "closed"}
BD_STATUS = {"open": "open", "in_progress": "in_progress", "closed": "closed"}
BD_TYPE = {"program": "program", "epic": "epic", "slice": "task", "pr": "task"}
BD_PRIORITY = {"program": "1", "epic": "2", "slice": "2", "pr": "2"}
LIST_ARGS = ["list", "--json", "--all"]


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


def _metadata_arg(cb: dict[str, Any]) -> str:
    # bd --metadata merges top-level keys. Send the whole block under "cb", so bd replaces the old block.
    return json.dumps({"cb": cb}, separators=(",", ":"))


def _create_argv(
    block: dict[str, Any],
    title: str,
    bd_type: str,
    priority: str,
    parent: str | None = None,
    external_ref: str | None = None,
) -> list[str]:
    # The flag order matches the recorded bd transcripts. Replays compare the whole argument list.
    argv = ["create", "--silent"]
    if parent is not None:
        argv += ["--parent", parent]
    argv += ["--type", bd_type, "--title", title, "--priority", priority]
    if external_ref is not None:
        argv += ["--external-ref", external_ref]
    argv += ["--metadata", _metadata_arg(block)]
    return argv


def _pr_number(ref: str) -> str:
    match = re.search(r"(\d+)$", ref)
    if match is None:
        raise ArgumentError(f"pull request ref {ref!r} must end in its GitHub number, such as pr-101")
    return match.group(1)


def _with_envelope(cb: dict[str, Any], changes: dict[str, Any]) -> dict[str, Any]:
    return {**cb, "envelope": {**(cb.get("envelope") or {}), **changes}}


def _bd_status(state: str) -> str:
    if state not in BD_STATUS:
        raise ArgumentError(f"state must be one of {tuple(BD_STATUS)}, not {state!r}")
    return BD_STATUS[state]


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

    def _rows(self) -> list[dict[str, Any]]:
        return json.loads(self.runner.run(LIST_ARGS))

    def _records(self) -> dict[str, TrackerRecord]:
        rows = self._rows()
        to_cb_id = self._cb_ids(rows)
        return {record.id: record for record in (self._record(row, to_cb_id) for row in rows)}

    @staticmethod
    def _cb_ids(rows: list[dict[str, Any]]) -> dict[str, str]:
        return {row["id"]: _cb_block(row)["id"] for row in rows}

    def _record(self, row: dict[str, Any], to_cb_id: dict[str, str]) -> TrackerRecord:
        cb = _cb_block(row)
        status = row.get("status")
        if status not in STATUS_MAP:
            raise AdapterError(f"bd issue {row['id']} has unknown status {status!r}")
        blocked_by = tuple(
            self._cb_id(to_cb_id, dep["depends_on_id"], row["id"])
            for dep in row.get("dependencies") or []
            if dep.get("type") == "blocks"
        )
        parent = self._cb_id(to_cb_id, row["parent"], row["id"]) if row.get("parent") else None
        return TrackerRecord(
            id=cb["id"],
            kind=cb["kind"],
            parent=parent,
            blocked_by=blocked_by,
            lifecycle=STATUS_MAP[status],
            assignee=row.get("assignee"),
            envelope=_envelope(cb),
            external_ref=row.get("external_ref"),
        )

    @staticmethod
    def _cb_id(to_cb_id: dict[str, str], bd_id: str, from_id: str) -> str:
        if bd_id not in to_cb_id:
            raise AdapterError(f"bd issue {from_id} refers to {bd_id}, which bd did not list")
        return to_cb_id[bd_id]

    @staticmethod
    def _find_row(rows: list[dict[str, Any]], id: str, kinds: tuple[str, ...]) -> dict[str, Any]:
        for row in rows:
            cb = _cb_block(row)
            if cb["id"] == id:
                if cb["kind"] not in kinds:
                    raise ArgumentError(f"{id} is a {cb['kind']}, not one of {kinds}")
                return row
        raise ArgumentError(f"no record with id {id}")

    def _after(
        self,
        rows: list[dict[str, Any]],
        row: dict[str, Any],
        block: dict[str, Any] | None = None,
        status: str | None = None,
    ) -> TrackerRecord:
        # The record that a read gives after this write. It needs no extra bd call.
        after = dict(row)
        if block is not None:
            after["metadata"] = {**(row.get("metadata") or {}), "cb": block}
        if status is not None:
            after["status"] = status
        return self._record(after, self._cb_ids(rows))

    def _update(
        self,
        row: dict[str, Any],
        status: str | None = None,
        block: dict[str, Any] | None = None,
        notes: str | None = None,
        force: bool = False,
    ) -> None:
        flags: list[str] = []
        if status is not None:
            flags += ["--status", status]
        if block is not None:
            flags += ["--metadata", _metadata_arg(block)]
        if notes is not None:
            flags += ["--append-notes", notes]
        if force:
            flags += ["--force"]
        self.runner.run(["update", row["id"], *flags])

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
        # bd writes take effect at once, and reads ask bd directly. The clone step runs `bd sync` in slice 9.
        return None

    def claim_slice(self, id: str, claimant: str) -> TrackerRecord:
        rows = self._rows()
        row = self._find_row(rows, id, ("slice",))
        try:
            self.runner.run(["update", row["id"], "--status", "in_progress", "--assignee", claimant])
        except BdError as error:
            raise AdapterError(f"claim of {id} refused: {error.stderr.strip()}") from error
        shown = json.loads(self.runner.run(["show", row["id"], "--json"]))[0]
        record = self._record(shown, self._cb_ids(rows))
        if record.assignee != claimant:
            raise AdapterError(f"claim of {id} read back assignee {record.assignee!r}, not {claimant!r}")
        return record

    def set_program_stage(self, program: str, stage: str) -> TrackerRecord:
        rows = self._rows()
        row = self._find_row(rows, program, ("program",))
        block = _with_envelope(_cb_block(row), {"stage": stage})
        self._update(row, block=block)
        return self._after(rows, row, block=block)

    def set_gate_value(self, program: str, gate: str, value: str) -> TrackerRecord:
        rows = self._rows()
        row = self._find_row(rows, program, ("program",))
        block = _with_envelope(_cb_block(row), {gate: value})
        self._update(row, block=block)
        return self._after(rows, row, block=block)

    def set_epic_state(self, epic: str, state: str, branch: str | None = None) -> TrackerRecord:
        status = _bd_status(state)
        rows = self._rows()
        row = self._find_row(rows, epic, ("epic",))
        block = _with_envelope(_cb_block(row), {} if branch is None else {"branch": branch})
        # CoBuilder state words are authoritative, and the tracker mirrors them. bd would refuse a close while children are open.
        self._update(row, status=status, block=block if branch is not None else None, force=status == "closed")
        return self._after(rows, row, block=block, status=status)

    def set_slice_state(
        self,
        id: str,
        state: str,
        score: float | None = None,
        attempts: int | None = None,
    ) -> TrackerRecord:
        status = _bd_status(state)
        rows = self._rows()
        row = self._find_row(rows, id, ("slice",))
        changes: dict[str, Any] = {}
        if score is not None:
            changes["score"] = score
        if attempts is not None:
            changes["attempts"] = attempts
        block = _with_envelope(_cb_block(row), changes)
        self._update(row, status=status, block=block if changes else None)
        return self._after(rows, row, block=block, status=status)

    def record_attempt(self, id: str, score: float, note: str | None = None) -> TrackerRecord:
        rows = self._rows()
        row = self._find_row(rows, id, ("slice",))
        cb = _cb_block(row)
        attempts = (cb.get("envelope") or {}).get("attempts", 0) + 1
        block = _with_envelope(cb, {"score": score, "attempts": attempts})
        self._update(row, block=block, notes=note)
        return self._after(rows, row, block=block)

    def add_note(self, id: str, text: str) -> None:
        rows = self._rows()
        row = self._find_row(rows, id, KINDS)
        self._update(row, notes=text)

    def escalate(self, id: str, score: float, reason: str) -> TrackerRecord:
        rows = self._rows()
        row = self._find_row(rows, id, ("slice",))
        block = _with_envelope(_cb_block(row), {"escalated": True, "score": score})
        self._update(row, block=block, notes=f"escalated at score {score}: {reason}")
        return self._after(rows, row, block=block)

    def create_record(self, record: TrackerRecord) -> TrackerRecord:
        # Only parent and blocker lookups need the list. A program create sends no list call.
        rows = self._rows() if record.parent is not None or record.blocked_by else []
        parent_bd_id = self._find_row(rows, record.parent, KINDS)["id"] if record.parent is not None else None
        blocker_bd_ids = [self._find_row(rows, blocker, KINDS)["id"] for blocker in record.blocked_by]
        block = {"v": CB_VERSION, "id": record.id, "kind": record.kind, "envelope": dict(record.envelope)}
        argv = _create_argv(
            block,
            record.id,
            BD_TYPE[record.kind],
            BD_PRIORITY[record.kind],
            parent=parent_bd_id,
            external_ref=record.external_ref,
        )
        bd_id = self.runner.run(argv).strip()
        for blocker_bd_id in blocker_bd_ids:
            # Each blocker edge is one bd dep add, sent in the recorded order.
            self.runner.run(["dep", "add", bd_id, blocker_bd_id])
        return record

    def open_pull_request(self, ref: str, epic_ids: list[str]) -> TrackerRecord:
        number = _pr_number(ref)
        rows = self._rows()
        if ref in self._cb_ids(rows).values():
            raise ArgumentError(f"record {ref} already exists")
        epic_rows = [self._find_row(rows, epic, ("epic",)) for epic in epic_ids]
        block = {"v": CB_VERSION, "id": ref, "kind": "pr", "envelope": {}}
        external_ref = f"gh-{number}"
        pr_bd_id = self.runner.run(
            _create_argv(block, ref, BD_TYPE["pr"], BD_PRIORITY["pr"], external_ref=external_ref)
        ).strip()
        for epic_row in epic_rows:
            # Each epic is blocked by the PR, so the epic is not ready until the PR closes.
            self.runner.run(["dep", "add", epic_row["id"], pr_bd_id])
        return TrackerRecord(
            id=ref,
            kind="pr",
            parent=None,
            blocked_by=(),
            lifecycle="open",
            assignee=None,
            envelope={},
            external_ref=external_ref,
        )

    def set_pull_request_state(self, ref: str, merged: bool) -> TrackerRecord:
        rows = self._rows()
        row = self._find_row(rows, ref, ("pr",))
        status = "closed" if merged else "open"
        self._update(row, status=status)
        return self._after(rows, row, status=status)

    def seed_from_files(self, plans_dir: Path, dry_run: bool = False) -> list[TrackerRecord]:
        rows = self._rows()
        held = set(self._cb_ids(rows).values())
        creates = [
            record
            for record in FilesAdapter(plans_dir).all_records()
            if record.id not in held and record.external_ref not in held
        ]
        if dry_run:
            return creates
        for record in creates:
            self._create_seeded(record)
        return creates

    def _create_seeded(self, record: TrackerRecord) -> TrackerRecord:
        try:
            return self.create_record(record)
        except BdError as error:
            if "type" not in error.stderr.lower():
                raise
        self._allow_program_type()
        return self.create_record(record)

    def _allow_program_type(self) -> None:
        current = self.runner.run(["config", "get", "types.custom"]).strip()
        types = [name for name in current.split(",") if name]
        if "program" not in types:
            self.runner.run(["config", "set", "types.custom", ",".join([*types, "program"])])
