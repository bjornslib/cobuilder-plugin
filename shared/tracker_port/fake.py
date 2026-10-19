"""FakeAdapter: an in-memory tracker that reads a corpus directory of JSON files."""

from __future__ import annotations

import json
from dataclasses import asdict, replace
from pathlib import Path
from typing import Any

from .fake_support import (
    CORPUS_FILES,
    READY_KINDS,
    check_lifecycle,
    envelope_refreshes,
    is_ready,
    load_corpus,
    load_state,
    now,
)
from .files import seedable_records
from .port import AdapterError, ArgumentError
from .record import Capabilities, Kind, TrackerRecord
from .regenerate import regenerate


class FakeAdapter:
    name = "fake"
    capabilities = Capabilities(
        native_ready=False,
        atomic_claim=True,
        rich_envelope=True,
        offline_read=True,
    )

    def __init__(self, corpus_dir: Path, state_file: Path | None = None) -> None:
        if not corpus_dir.is_dir():
            raise AdapterError(f"corpus directory not found: {corpus_dir}")
        self._state_file = state_file
        if state_file is not None and state_file.is_file():
            self._records, self._notes = load_state(state_file)
        else:
            self._records = [record for name in CORPUS_FILES for record in load_corpus(corpus_dir, name)]
            self._notes = {}

    def _commit(self) -> None:
        # Save the whole state after each write, so the next call reads it back.
        if self._state_file is None:
            return
        state = {"records": [asdict(record) for record in self._records], "notes": self._notes}
        self._state_file.parent.mkdir(parents=True, exist_ok=True)
        self._state_file.write_text(json.dumps(state, indent=2, sort_keys=True), encoding="utf-8")

    def seed_from_files(
        self, plans_dir: Path, dry_run: bool = False, refresh_envelope: bool = False
    ) -> list[TrackerRecord]:
        # Create only the records the adapter does not hold, keyed by external_ref.
        known = {record.external_ref for record in self._records}
        found, self.seed_conflicts = seedable_records(plans_dir)
        creates = [record for record in found if record.external_ref not in known]
        refreshed = envelope_refreshes(self._records, found) if refresh_envelope else {}
        if not dry_run:
            self._records = [refreshed.get(record.id, record) for record in self._records] + creates
            # A refresh with nothing to change writes nothing.
            if creates or refreshed or not refresh_envelope:
                self._commit()
        return creates + list(refreshed.values())

    def regenerate_status_files(self, program: str, plans_dir: Path) -> list[Path]:
        return regenerate(self, program, plans_dir)

    def _of_kind(self, kind: Kind) -> list[TrackerRecord]:
        return [record for record in self._records if record.kind == kind]

    def _record_of(self, id: str, kind: Kind | None = None) -> TrackerRecord:
        for record in self._records:
            if record.id == id and (kind is None or record.kind == kind):
                return record
        raise ArgumentError(f"no {kind or 'record'} with id {id}")

    def _update(
        self,
        id: str,
        kind: Kind | None,
        *,
        envelope: dict[str, Any] | None = None,
        **fields: Any,
    ) -> TrackerRecord:
        current = self._record_of(id, kind)
        if envelope:
            fields["envelope"] = {**current.envelope, **envelope}
        updated = replace(current, **fields)
        self._records = [updated if record is current else record for record in self._records]
        self._commit()
        return updated

    def list_programs(self) -> list[TrackerRecord]:
        return self._of_kind("program")

    def list_epics(self, program: str | None = None) -> list[TrackerRecord]:
        return [r for r in self._of_kind("epic") if program is None or r.parent == program]

    def list_slices(self, epic: str | None = None) -> list[TrackerRecord]:
        return [r for r in self._of_kind("slice") if epic is None or r.parent == epic]

    def list_pull_requests(self) -> list[TrackerRecord]:
        return self._of_kind("pr")

    def get_slice(self, id: str) -> TrackerRecord:
        for record in self.list_slices():
            if record.id == id:
                return record
        raise ArgumentError(f"no slice with id {id}")

    def next_ready(self, kind: str = "slice", under: str | None = None) -> list[TrackerRecord]:
        if kind not in READY_KINDS:
            raise ArgumentError(f"kind must be one of {', '.join(READY_KINDS)}, not {kind}")
        by_id = {record.id: record for record in self._records}
        return [
            record
            for record in self._of_kind(kind)
            if (under is None or record.parent == under) and is_ready(record, by_id)
        ]

    def sync(self) -> None:
        """The fake holds no remote state, so there is nothing to sync."""

    def claim_slice(self, id: str, claimant: str) -> TrackerRecord:
        return self._update(id, "slice", assignee=claimant)

    def set_program_stage(self, program: str, stage: str) -> TrackerRecord:
        return self._update(program, "program", envelope={"stage": stage})

    def set_gate_value(self, program: str, gate: str, value: str) -> TrackerRecord:
        return self._update(program, "program", envelope={gate: value})

    def set_epic_state(self, epic: str, state: str, branch: str | None = None) -> TrackerRecord:
        check_lifecycle(state)
        envelope = {} if branch is None else {"branch": branch}
        return self._update(epic, "epic", lifecycle=state, envelope=envelope)

    def set_slice_state(
        self,
        id: str,
        state: str,
        score: float | None = None,
        attempts: int | None = None,
    ) -> TrackerRecord:
        check_lifecycle(state)
        envelope: dict[str, Any] = {}
        if score is not None:
            envelope["score"] = score
        if attempts is not None:
            envelope["attempts"] = attempts
        return self._update(id, "slice", lifecycle=state, envelope=envelope)

    def record_attempt(self, id: str, score: float, note: str | None = None) -> TrackerRecord:
        attempts = self._record_of(id, "slice").envelope.get("attempts", 0)
        if note is not None:
            self.add_note(id, note)
        return self._update(id, "slice", envelope={"score": score, "attempts": attempts + 1})

    def add_note(self, id: str, text: str) -> None:
        self._record_of(id)
        self._notes.setdefault(id, []).append((now(), text))
        self._commit()

    def escalate(self, id: str, score: float, reason: str) -> TrackerRecord:
        record = self._update(id, "slice", envelope={"escalated": True, "score": score})
        self.add_note(id, f"escalated at score {score}: {reason}")
        return record

    def open_pull_request(self, ref: str, epic_ids: list[str]) -> TrackerRecord:
        if any(record.id == ref for record in self._records):
            raise ArgumentError(f"pull request already exists: {ref}")
        for epic in epic_ids:
            self._record_of(epic, "epic")
        pull_request = TrackerRecord(
            id=ref,
            kind="pr",
            parent=None,
            blocked_by=(),
            lifecycle="open",
            assignee=None,
            envelope={},
            external_ref=None,
        )
        self._records.append(pull_request)
        for epic in epic_ids:
            current = self._record_of(epic, "epic")
            self._update(epic, "epic", blocked_by=current.blocked_by + (ref,))
        self._commit()
        return pull_request

    def set_pull_request_state(self, ref: str, merged: bool) -> TrackerRecord:
        return self._update(ref, "pr", lifecycle="closed" if merged else "open")

