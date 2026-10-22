"""The beads adapter. Reads the tracker through `bd list --json --all` and maps each row to a TrackerRecord.

Only this module, its helper modules, and bd_runner.py may call bd. The reads live here. The writes
live in beads_writes.py, and the seed in beads_seed.py. Seeding creates the records that the list
does not hold.
"""

from __future__ import annotations

import json
from collections.abc import Callable
from pathlib import Path
from typing import Any

from .bd_runner import BdError
from .beads_rows import (
    LIST_ARGS,
    READY_KINDS,
    STATUS_MAP,
    _cb_block,
    _envelope,
    _is_cb_row,
    _is_ready,
    _metadata_arg,
)
from .beads_seed import _SeedMixin
from .beads_pull_requests import _PullRequestMixin
from .beads_writes import _WriteMixin
from .skip_slice import _BeadsSkipMixin
from .beads_sync import _SyncModeMixin
from .port import AdapterError, ArgumentError
from .sync_state import SYNC_MODES, spawn_worker
from .record import Capabilities, Kind, TrackerRecord
from .regenerate import regenerate

__all__ = ["LIST_ARGS", "BeadsAdapter", "_cb_block", "_metadata_arg"]


class BeadsAdapter(_SyncModeMixin, _WriteMixin, _PullRequestMixin, _SeedMixin, _BeadsSkipMixin):
    name = "beads"
    # Readiness comes from blocked_by, not from bd. bd update has no atomic claim.
    capabilities = Capabilities(native_ready=False, atomic_claim=False, rich_envelope=True, offline_read=True)

    def __init__(
        self, runner: Any, sync: str = "write", spawner: Callable[[Path], None] | None = None, repo_root: Path | None = None
    ) -> None:
        if sync not in SYNC_MODES:
            raise AdapterError(f"sync must be one of {', '.join(SYNC_MODES)}, not {sync!r}")
        self.runner = runner
        self._batching = False
        self.sync_mode = sync
        self.spawner = spawner or spawn_worker
        self.repo_root = repo_root or Path.cwd()

    def _all_rows(self) -> list[dict[str, Any]]:
        return json.loads(self.runner.run(LIST_ARGS))

    def _rows(self) -> list[dict[str, Any]]:
        # A foreign issue carries no metadata.cb block. Every read and write ignores it.
        return [row for row in self._all_rows() if _is_cb_row(row)]

    def doctor_details(self) -> dict[str, Any]:
        return {"foreign_issues": sum(1 for row in self._all_rows() if not _is_cb_row(row)), **self._sync_details()}

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
        # Publish and pull the tracker through bd. A failed sync raises, and the message keeps bd's stderr.
        try:
            self.runner.run(["sync"])
        except BdError as error:
            if "no branches found in remote" not in error.stderr:
                raise AdapterError(f"bd sync failed: {error.stderr.strip() or error}") from error
            # The first publish to an empty remote fails the pull. Push the dolt data, then sync once more.
            self._run_or_raise(["dolt", "push"])
            self._run_or_raise(["sync"])

    def _run_or_raise(self, argv: list[str]) -> None:
        try:
            self.runner.run(argv)
        except BdError as error:
            raise AdapterError(f"bd {' '.join(argv)} failed: {error.stderr.strip() or error}") from error

    def regenerate_status_files(self, program: str, plans_dir: Path) -> list[Path]:
        return regenerate(self, program, plans_dir)
