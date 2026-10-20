"""The files adapter. It reads the plans tree and refuses every write.

A plans tree holds one directory per program. Each directory has a
``00-status.md`` gate table and a ``04-slices.md`` slice table. This adapter
projects that tree to the record shape that the fake adapter uses. It never
calls ``bd``.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, NoReturn

from .design_records import design_records
from .plan_records import PlanError, _epic_and_slice_records, _program_record
from .port import AdapterError, ArgumentError, NoAdapterError
from .record import Capabilities, TrackerRecord

STATUS_FILE = "00-status.md"
SLICES_FILE = "04-slices.md"


def _refuse(self: object, *args: Any, **kwargs: Any) -> NoReturn:
    raise NoAdapterError("the files adapter reads state and writes none. Configure a tracker adapter to write.")


class FilesAdapter:
    name = "files"
    capabilities = Capabilities(
        native_ready=False,
        atomic_claim=False,
        rich_envelope=True,
        offline_read=True,
    )

    def __init__(self, plans_dir: Path) -> None:
        if not plans_dir.is_dir():
            raise AdapterError(f"plans directory not found: {plans_dir}")
        self._plans_dir = plans_dir
        self.conflicts: list[dict[str, str]] = []

    def all_records(self) -> list[TrackerRecord]:
        # A conflicted plan keeps its program record. Its epic and slice records are dropped.
        # A plan with no 00-status.md still lists its slices. Its gates and checkboxes read as empty.
        self.conflicts = []
        records: list[TrackerRecord] = []
        for directory in sorted(self._plans_dir.iterdir()):
            status_path = directory / STATUS_FILE
            slices_path = directory / SLICES_FILE
            if not status_path.is_file() and not slices_path.is_file():
                continue
            status_text = status_path.read_text(encoding="utf-8") if status_path.is_file() else ""
            records.append(_program_record(directory, status_text))
            if not slices_path.is_file():
                continue
            try:
                records.extend(
                    _epic_and_slice_records(
                        directory.name,
                        slices_path.read_text(encoding="utf-8"),
                        status_text,
                        self._plans_dir,
                    )
                )
            except PlanError as error:
                self.conflicts.append({"plan": directory.name, "reason": error.reason, "text": error.text})
        records.extend(design_records(self._plans_dir, records))
        return records

    def list_programs(self) -> list[TrackerRecord]:
        return [record for record in self.all_records() if record.kind == "program"]

    def list_epics(self, program: str | None = None) -> list[TrackerRecord]:
        return [record for record in self.all_records() if record.kind == "epic" and program in (None, record.parent)]

    def list_slices(self, epic: str | None = None) -> list[TrackerRecord]:
        return [record for record in self.all_records() if record.kind == "slice" and epic in (None, record.parent)]

    def get_slice(self, id: str) -> TrackerRecord:
        for record in self.list_slices():
            if record.id == id:
                return record
        raise ArgumentError(f"no slice with id {id}")

    def seed_from_files(
        self, plans_dir: Path, dry_run: bool = False, refresh_envelope: bool = False
    ) -> list[TrackerRecord]:
        # This adapter holds no record, so a dry run plans every record. A real seed refuses.
        if not dry_run:
            _refuse(self)
        records, self.seed_conflicts = seedable_records(plans_dir)
        return records

    def list_pull_requests(self) -> list[TrackerRecord]:
        raise AdapterError("the files adapter reads no pull requests. Read them from gh instead.")

    def next_ready(self, kind: str = "slice", under: str | None = None) -> list[TrackerRecord]:
        raise AdapterError("the files adapter does not compute ready work.")

    def prepare(self) -> dict[str, bool]:
        # This adapter writes nothing, so it needs no setup.
        return {"changed": False}

    sync = _refuse
    claim_slice = _refuse
    set_program_stage = _refuse
    set_gate_value = _refuse
    set_epic_state = _refuse
    set_slice_state = _refuse
    record_attempt = _refuse
    add_note = _refuse
    escalate = _refuse
    open_pull_request = _refuse
    set_pull_request_state = _refuse
    regenerate_status_files = _refuse


def seedable_records(plans_dir: Path) -> tuple[list[TrackerRecord], list[dict[str, str]]]:
    # A conflicted plan contributes no record to a seed, so its program record is dropped too.
    files = FilesAdapter(plans_dir)
    records = files.all_records()
    conflicted = {conflict["plan"] for conflict in files.conflicts}
    kept = [record for record in records if not (record.kind == "program" and record.id in conflicted)]
    return kept, files.conflicts
