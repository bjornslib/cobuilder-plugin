"""The write operations of the beads adapter. Each one reads the list, runs bd, and publishes once."""

from __future__ import annotations

import json
import re
from typing import Any

from .bd_runner import BdError, claim_argv
from .plan_program import missing_program_record
from .beads_rows import (
    CB_VERSION,
    KINDS,
    _bd_status,
    _cb_block,
    _create_argv,
    _with_envelope,
    lookup_argv,
    record_options,
)
from .port import AdapterError, ArgumentError
from .program_state import program_lifecycle
from .beads_title import bd_title
from .record import TrackerRecord


class _WriteMixin:
    """Write methods. `BeadsAdapter` supplies the runner, the row reads, and the update helpers."""

    runner: Any

    def claim_slice(self, id: str, claimant: str) -> TrackerRecord:
        rows = self._rows()
        row = self._find_row(rows, id, ("slice",))
        try:
            self.runner.run(claim_argv(row["id"], claimant))
        except BdError as error:
            holder = re.search(r"already claimed by (\S+)", error.stderr)
            detail = f"already claimed by {holder.group(1)}" if holder else error.stderr.strip()
            raise AdapterError(f"claim of {id} refused: {detail}") from error
        record = self._record({**row, "status": "in_progress", "assignee": claimant}, self._cb_ids(rows))
        self._publish()
        return record

    def set_program_stage(self, program: str, stage: str, plans_dir: Path | None = None) -> TrackerRecord:
        # The stage also sets the program's bd status. The status is written only on a change.
        rows = self._rows()
        try:
            row = self._find_row(rows, program, ("program",))
        except ArgumentError as error:
            if not (str(error).startswith("no record with id") and plans_dir is not None):
                raise
            # The tracker holds no program row, so create one from the plan texts.
            return self.create_record(missing_program_record(program, stage, plans_dir))
        block = _with_envelope(_cb_block(row), {"stage": stage})
        held = self._after(rows, row, block=block)
        ids = self._cb_ids(rows)
        epics = [r for r in (self._record(x, ids) for x in rows) if r.kind == "epic" and r.parent == program]
        wanted = program_lifecycle(stage, epics)
        status = _bd_status(wanted) if wanted != held.lifecycle else None
        self._update(row, status=status, block=block, force=status is not None and wanted == "closed")
        self._publish()
        return self._after(rows, row, block=block, status=status)

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
        after = self._after(rows, row, block=block, status=status)
        self._follow_program(rows, after)
        self._publish()
        return after

    def _follow_program(self, rows: list[dict[str, Any]], epic: TrackerRecord) -> None:
        # The program lifecycle follows its epics. One update writes it, and only on a change.
        ids = self._cb_ids(rows)
        records = [epic if ids[r["id"]] == epic.id else self._record(r, ids) for r in rows]
        program = next((r for r in records if r.kind == "program" and r.id == epic.parent), None)
        if program is None:
            return
        wanted = program_lifecycle(
            program.envelope.get("stage"), (r for r in records if r.kind == "epic" and r.parent == program.id)
        )
        if wanted != program.lifecycle:
            program_row = next(r for r in rows if ids[r["id"]] == program.id)
            self._update(program_row, status=_bd_status(wanted), force=wanted == "closed")

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
        # The list shows whether the id is held, and the ref lookup shows whether the ref is held.
        # A held id or ref is refused before any bd create.
        rows = self._rows()
        if record.id in self._cb_ids(rows).values():
            raise ArgumentError(f"a record with id {record.id} already exists")
        if record.external_ref and json.loads(self.runner.run(lookup_argv(record.external_ref))):
            raise ArgumentError(f"a record with external ref {record.external_ref} already exists")
        parent_bd_id = self._find_row(rows, record.parent, KINDS)["id"] if record.parent is not None else None
        blocker_bd_ids = [self._find_row(rows, blocker, KINDS)["id"] for blocker in record.blocked_by]
        block = {"v": CB_VERSION, "id": record.id, "kind": record.kind, "envelope": dict(record.envelope)}
        argv = _create_argv(
            block,
            title=bd_title(record.id, record.kind, record.title),
            parent=parent_bd_id,
            status="in_progress" if record.lifecycle == "in_progress" else None,
            options=record_options(record),
        )
        bd_id = self.runner.run(argv).strip()
        for blocker_bd_id in blocker_bd_ids:
            # Each blocker edge is one bd dep add, sent in the recorded order.
            self.runner.run(["dep", "add", bd_id, blocker_bd_id])
        if record.lifecycle == "closed" or (
            record.kind == "program" and program_lifecycle(record.envelope.get("stage"), ()) == "closed"
        ):
            self.runner.run(["close", bd_id, "--force"])
        self._publish()
        return record

    def prepare(self) -> dict[str, bool]:
        # A program is the native type `feature`, so bd needs no custom issue type and prepare sets none.
        return {"changed": False}
