"""The write operations of the beads adapter. Each one reads the list, runs bd, and publishes once."""

from __future__ import annotations

import json
from typing import Any

from .bd_runner import BdError
from .beads_rows import (
    CB_VERSION,
    KINDS,
    _bd_status,
    _cb_block,
    _create_argv,
    _pr_number,
    _with_envelope,
)
from .port import AdapterError, ArgumentError
from .record import TrackerRecord


class _WriteMixin:
    """Write methods. `BeadsAdapter` supplies the runner, the row reads, and the update helpers."""

    runner: Any

    def claim_slice(self, id: str, claimant: str) -> TrackerRecord:
        rows = self._rows()
        row = self._find_row(rows, id, ("slice",))
        try:
            self.runner.run(["update", row["id"], "--status", "in_progress", "--assignee", claimant])
        except BdError as error:
            raise AdapterError(f"claim of {id} refused: {error.stderr.strip()}") from error
        shown = json.loads(self.runner.run(["show", row["id"], "--json"]))[0]
        record = self._record(shown, self._cb_ids(rows))
        self._publish()
        if record.assignee != claimant:
            raise AdapterError(f"claim of {id} read back assignee {record.assignee!r}, not {claimant!r}")
        return record

    def set_program_stage(self, program: str, stage: str) -> TrackerRecord:
        rows = self._rows()
        row = self._find_row(rows, program, ("program",))
        block = _with_envelope(_cb_block(row), {"stage": stage})
        self._update(row, block=block)
        self._publish()
        return self._after(rows, row, block=block)

    def set_gate_value(self, program: str, gate: str, value: str) -> TrackerRecord:
        rows = self._rows()
        row = self._find_row(rows, program, ("program",))
        block = _with_envelope(_cb_block(row), {gate: value})
        self._update(row, block=block)
        self._publish()
        return self._after(rows, row, block=block)

    def set_epic_state(self, epic: str, state: str, branch: str | None = None) -> TrackerRecord:
        status = _bd_status(state)
        rows = self._rows()
        row = self._find_row(rows, epic, ("epic",))
        block = _with_envelope(_cb_block(row), {} if branch is None else {"branch": branch})
        # CoBuilder state words are authoritative, and the tracker mirrors them. bd would refuse a close while children are open.
        self._update(row, status=status, block=block if branch is not None else None, force=status == "closed")
        self._publish()
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
        self._publish()
        return self._after(rows, row, block=block, status=status)

    def record_attempt(self, id: str, score: float, note: str | None = None) -> TrackerRecord:
        rows = self._rows()
        row = self._find_row(rows, id, ("slice",))
        cb = _cb_block(row)
        attempts = (cb.get("envelope") or {}).get("attempts", 0) + 1
        block = _with_envelope(cb, {"score": score, "attempts": attempts})
        self._update(row, block=block, notes=note)
        self._publish()
        return self._after(rows, row, block=block)

    def add_note(self, id: str, text: str) -> None:
        rows = self._rows()
        row = self._find_row(rows, id, KINDS)
        self._update(row, notes=text)
        self._publish()

    def escalate(self, id: str, score: float, reason: str) -> TrackerRecord:
        rows = self._rows()
        row = self._find_row(rows, id, ("slice",))
        block = _with_envelope(_cb_block(row), {"escalated": True, "score": score})
        self._update(row, block=block, notes=f"escalated at score {score}: {reason}")
        self._publish()
        return self._after(rows, row, block=block)

    def create_record(self, record: TrackerRecord) -> TrackerRecord:
        # Only parent and blocker lookups need the list. A program create sends no list call.
        rows = self._rows() if record.parent is not None or record.blocked_by else []
        parent_bd_id = self._find_row(rows, record.parent, KINDS)["id"] if record.parent is not None else None
        blocker_bd_ids = [self._find_row(rows, blocker, KINDS)["id"] for blocker in record.blocked_by]
        block = {"v": CB_VERSION, "id": record.id, "kind": record.kind, "envelope": dict(record.envelope)}
        argv = _create_argv(
            block, parent=parent_bd_id, external_ref=record.external_ref, assignee=record.assignee
        )
        bd_id = self.runner.run(argv).strip()
        for blocker_bd_id in blocker_bd_ids:
            # Each blocker edge is one bd dep add, sent in the recorded order.
            self.runner.run(["dep", "add", bd_id, blocker_bd_id])
        if record.lifecycle == "closed":
            self.runner.run(["close", bd_id, "--force"])
        self._publish()
        return record

    def open_pull_request(self, ref: str, epic_ids: list[str]) -> TrackerRecord:
        number = _pr_number(ref)
        rows = self._rows()
        if ref in self._cb_ids(rows).values():
            raise ArgumentError(f"record {ref} already exists")
        epic_rows = [self._find_row(rows, epic, ("epic",)) for epic in epic_ids]
        block = {"v": CB_VERSION, "id": ref, "kind": "pr", "envelope": {}}
        external_ref = f"gh-{number}"
        pr_bd_id = self.runner.run(_create_argv(block, external_ref=external_ref)).strip()
        for epic_row in epic_rows:
            # Each epic is blocked by the PR, so the epic is not ready until the PR closes.
            self.runner.run(["dep", "add", epic_row["id"], pr_bd_id])
        self._publish()
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
        self._publish()
        return self._after(rows, row, status=status)
