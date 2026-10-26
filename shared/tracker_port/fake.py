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
    is_under,
    load_corpus,
    load_state,
)
from .files import seedable_records
from .plan_program import missing_program_record
from .port import AdapterError, ArgumentError
from .program_state import program_lifecycle
from .record import Capabilities, Kind, TrackerRecord
from .fake_activity import _FakeActivityMixin
from .fake_pull_requests import _PullRequestMixin
from .fake_repair import _FakeRepairMixin
from .skip_slice import _FakeSkipMixin
from .regenerate import regenerate


class FakeAdapter(_PullRequestMixin, _FakeSkipMixin, _FakeActivityMixin, _FakeRepairMixin):
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

    def all_records(self) -> list[TrackerRecord]:
        return list(self._records)

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
            if is_under(record, under, by_id) and is_ready(record, by_id)
        ]

    def sync(self) -> None:
        """The fake holds no remote state, so there is nothing to sync."""

    def prepare(self) -> dict[str, bool]:
        """The fake needs no setup."""
        return {"changed": False}

    def claim_slice(self, id: str, claimant: str) -> TrackerRecord:
        return self._update(id, "slice", assignee=claimant)

    def claim_next(self, claimant: str, under: str | None = None) -> TrackerRecord | None:
        if under is not None and self._record_of(under).kind not in ("epic", "program"):
            raise ArgumentError(f"{under} is not an epic or a program")
        ready = sorted(self.next_ready("slice", under), key=lambda record: record.id)
        if not ready:
            return None
        record = self._update(ready[0].id, "slice", assignee=claimant, lifecycle="in_progress")
        epic = next((r for r in self._of_kind("epic") if r.id == record.parent), None)
        if epic is not None and epic.lifecycle == "open":
            self.set_epic_state(epic.id, "in_progress")
        return record

    def set_program_stage(self, program: str, stage: str, plans_dir: Path | None = None) -> TrackerRecord:
        if self._record_of_kind_or_none(program, "program") is None:
            if plans_dir is None:
                raise ArgumentError(f"no program with id {program}")
            # The fake holds no program, so create one from the plan texts.
            return self._create_program(missing_program_record(program, stage, plans_dir))
        record = self._update(program, "program", envelope={"stage": stage})
        return self._refollow(record)

    def _record_of_kind_or_none(self, id: str, kind: Kind) -> TrackerRecord | None:
        return next((record for record in self._records if record.id == id and record.kind == kind), None)

    def _create_program(self, record: TrackerRecord) -> TrackerRecord:
        self._records.append(record)
        self._commit()
        return record

    def _refollow(self, program: TrackerRecord) -> TrackerRecord:
        wanted = program_lifecycle(program.envelope.get("stage"), self.list_epics(program.id))
        return program if wanted == program.lifecycle else self._update(program.id, "program", lifecycle=wanted)

    def set_gate_value(self, program: str, gate: str, value: str) -> TrackerRecord:
        return self._update(program, "program", envelope={gate: value})

    def set_epic_state(self, epic: str, state: str, branch: str | None = None) -> TrackerRecord:
        check_lifecycle(state)
        envelope = {} if branch is None else {"branch": branch}
        record = self._update(epic, "epic", lifecycle=state, envelope=envelope)
        self._follow_program(record)
        return record

    def _follow_program(self, epic: TrackerRecord) -> None:
        # The program lifecycle follows its epics. A write happens only on a change.
        program = next((r for r in self._of_kind("program") if r.id == epic.parent), None)
        if program is None:
            return
        self._refollow(program)

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

