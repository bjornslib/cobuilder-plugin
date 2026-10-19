"""The files adapter. It reads the plans tree and refuses every write.

A plans tree holds one directory per program. Each directory has a
``00-status.md`` gate table and a ``04-slices.md`` slice table. This adapter
projects that tree to the record shape that the fake adapter uses. It never
calls ``bd``.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any, NoReturn

from gate_status import parse_status_gates
from slice_table import parse_table

from .port import AdapterError, ArgumentError, NoAdapterError
from .record import Capabilities, TrackerRecord

STATUS_FILE = "00-status.md"
SLICES_FILE = "04-slices.md"
DONE_STATES = frozenset({"done", "completed", "accepted"})
OPEN_STATES = frozenset({"pending", "planned", "backlog"})
VOID_STATE = "void"
ATTEMPT_CELL = re.compile(r"^(\d+(?:\.\d+)?)\s*\(attempt\s+(\d+)\)$")
PARENTHETICAL = re.compile(r"\s*\(.*\)$")


class PlanError(AdapterError):
    """A plan the files adapter cannot read. It names the problem and quotes the text at fault."""

    def __init__(self, reason: str, text: str) -> None:
        super().__init__(reason)
        self.reason = reason
        self.text = text


def _refuse(self: object, *args: Any, **kwargs: Any) -> NoReturn:
    raise NoAdapterError("the files adapter reads state and writes none. Configure a tracker adapter to write.")


def _score(cell: str | None) -> tuple[float | None, int | None]:
    # A cell holds a score, a score with its attempt count, or an em dash for no score.
    if not cell or cell == "\u2014":
        return None, None
    match = ATTEMPT_CELL.match(cell)
    if match:
        return float(match.group(1)), int(match.group(2))
    try:
        return float(cell), None
    except ValueError as exc:
        raise PlanError(f"score cell is not a number: {cell!r}", cell) from exc


def _lifecycle(cell: str | None) -> tuple[str, bool]:
    # Return the lifecycle and whether the slice is void. A blank state reads as open.
    word = PARENTHETICAL.sub("", cell or "").strip().lower()
    if word in DONE_STATES or word == VOID_STATE:
        return "closed", word == VOID_STATE
    if word in OPEN_STATES or not word:
        return "open", False
    raise PlanError(f"state cell is not a known state: {cell!r}", cell or "")


def _program_record(directory: Path) -> TrackerRecord:
    program = directory.name
    gates = parse_status_gates((directory / STATUS_FILE).read_text(encoding="utf-8"))
    return TrackerRecord(
        id=program,
        kind="program",
        parent=None,
        blocked_by=(),
        lifecycle="open",
        assignee=None,
        envelope={f"gate{gate['n']}": gate["state"] for gate in gates},
        external_ref=program,
    )


def _epic_and_slice_records(program: str, text: str) -> list[TrackerRecord]:
    table = parse_table(text)
    if table.unparsed:
        raise PlanError(
            f"{program} has slice rows the parser cannot read",
            "\n".join(str(line) for line in table.unparsed),
        )
    epic_ids = set(table.header_epic_ids)
    records = [
        TrackerRecord(
            id=epic_id,
            kind="epic",
            parent=program,
            blocked_by=(),
            lifecycle="open",
            assignee=None,
            envelope={"epic_id": epic_id.rsplit("/", 1)[-1]},
            external_ref=epic_id,
        )
        for epic_id in table.header_epic_ids
    ]
    # Each slice waits for the slice row above it in the same epic.
    last_in_epic: dict[str, str] = {}
    slice_ids: set[str] = set()
    for row in table.rows:
        if row.epic_id not in epic_ids:
            raise PlanError(f"slice {row.n} names epic {row.epic_id!r}, which has no epic header row", row.raw)
        slice_id = f"{program}/{row.n}"
        if slice_id in slice_ids:
            raise PlanError(f"slice id {slice_id} appears twice", row.raw)
        slice_ids.add(slice_id)
        blocker = last_in_epic.get(row.epic_id)
        lifecycle, void = _lifecycle(row.state)
        score, attempts = _score(row.score)
        envelope: dict[str, Any] = {
            "ends_with": row.ends_with,
            "feature": program,
            "n": row.n,
            "score": score,
        }
        if attempts is not None:
            envelope["attempts"] = attempts
        if void:
            envelope["void"] = True
        records.append(
            TrackerRecord(
                id=slice_id,
                kind="slice",
                parent=row.epic_id,
                blocked_by=(blocker,) if blocker else (),
                lifecycle=lifecycle,
                assignee=None,
                envelope=envelope,
                external_ref=slice_id,
            )
        )
        last_in_epic[row.epic_id] = slice_id
    return records


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
        self.conflicts = []
        records: list[TrackerRecord] = []
        for directory in sorted(self._plans_dir.iterdir()):
            if not (directory / STATUS_FILE).is_file():
                continue
            records.append(_program_record(directory))
            slices_path = directory / SLICES_FILE
            if not slices_path.is_file():
                continue
            try:
                records.extend(_epic_and_slice_records(directory.name, slices_path.read_text(encoding="utf-8")))
            except PlanError as error:
                self.conflicts.append({"plan": directory.name, "reason": error.reason, "text": error.text})
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

    def list_pull_requests(self) -> list[TrackerRecord]:
        raise AdapterError("the files adapter reads no pull requests. Read them from gh instead.")

    def next_ready(self, kind: str = "slice", under: str | None = None) -> list[TrackerRecord]:
        raise AdapterError("the files adapter does not compute ready work.")

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
    seed_from_files = _refuse


def seedable_records(plans_dir: Path) -> tuple[list[TrackerRecord], list[dict[str, str]]]:
    # A conflicted plan contributes no record to a seed, so its program record is dropped too.
    files = FilesAdapter(plans_dir)
    records = files.all_records()
    conflicted = {conflict["plan"] for conflict in files.conflicts}
    kept = [record for record in records if not (record.kind == "program" and record.id in conflicted)]
    return kept, files.conflicts
