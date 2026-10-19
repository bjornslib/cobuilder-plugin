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
from slice_table import parse_header_epic_id, parse_row, parse_table

from .port import AdapterError, ArgumentError, NoAdapterError
from .record import Capabilities, TrackerRecord

STATUS_FILE = "00-status.md"
SLICES_FILE = "04-slices.md"
# The one parser of a slice checkbox line. A slice line that does not match stays open.
STATUS_SLICE_RE = re.compile(
    r"^-\s*\[(x| )\]\s*Slice\s*(\d+)\s*[—–-]\s*(.*?)(?:\s+score:\s*([^\s]+)(?:\s+on\s+attempt\s+(\d+))?)?$",
    re.IGNORECASE,
)

# A Score cell such as "0.917 (attempt 2)". It reads a number and an optional attempt count.
SCORE_CELL_RE = re.compile(r"^(\d+(?:\.\d+)?)(?:\s*\(attempt\s+(\d+)\))?$")


class PlanError(AdapterError):
    """A plan the files adapter cannot read. It names the problem and quotes the text at fault."""

    def __init__(self, reason: str, text: str) -> None:
        super().__init__(reason)
        self.reason = reason
        self.text = text


def _refuse(self: object, *args: Any, **kwargs: Any) -> NoReturn:
    raise NoAdapterError("the files adapter reads state and writes none. Configure a tracker adapter to write.")


def _status_slices(text: str) -> dict[int, dict[str, Any]]:
    # A checkbox line that STATUS_SLICE_RE matches sets a slice's lifecycle. Its score token and attempt count
    # win over the table when STATUS_SLICE_RE captures them. A score token of — or none reads as no score.
    slices: dict[int, dict[str, Any]] = {}
    for line in text.splitlines():
        match = STATUS_SLICE_RE.search(line.strip())
        if not match:
            continue
        slices[int(match.group(2))] = {
            "checked": match.group(1).lower() == "x",
            "score": match.group(4),
            "attempts": int(match.group(5)) if match.group(5) else None,
        }
    return slices


def _status_score(token: str | None) -> float | None:
    # A score token from the status line. A dash, or text that is not a number, reads as no score.
    if token is None or token == "—":
        return None
    try:
        return float(token)
    except ValueError:
        return None



def _table_score(cell: str | None) -> tuple[float | None, int | None]:
    # Reads a Score cell such as "0.917 (attempt 2)". A cell that is not a number, such as — or void, reads as no score.
    if cell is None:
        return None, None
    match = SCORE_CELL_RE.match(cell.strip())
    if match is None:
        return None, None
    attempts = int(match.group(2)) if match.group(2) else None
    return float(match.group(1)), attempts


def _program_record(directory: Path, status_text: str) -> TrackerRecord:
    program = directory.name
    gates = parse_status_gates(status_text)
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


def _row_epics(text: str) -> dict[str, str]:
    # A row with a blank Epic cell belongs to the epic header above it. Maps each slice row's raw line to its epic.
    current = ""
    epics: dict[str, str] = {}
    for line in text.splitlines():
        header_id = parse_header_epic_id(line)
        if header_id is not None:
            current = header_id
            continue
        row = parse_row(line)
        if row is not None:
            epics[row.raw] = row.epic_id or current
    return epics


def _epic_and_slice_records(program: str, text: str, status_text: str) -> list[TrackerRecord]:
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
    row_epics = _row_epics(text)
    last_in_epic: dict[str, str] = {}
    slice_ids: set[str] = set()
    status = _status_slices(status_text)
    for row in table.rows:
        slice_id = f"{program}/{row.n}"
        if slice_id in slice_ids:
            raise PlanError(f"slice id {slice_id} appears twice", row.raw)
        slice_ids.add(slice_id)
        epic_id = row_epics[row.raw]
        blocker = last_in_epic.get(epic_id)
        checkbox = status.get(row.n)
        table_score, table_attempts = _table_score(row.score)
        if checkbox is None:
            # No checkbox line: the table State cell sets the lifecycle. The table score counts only for a closed slice.
            checked = (row.state or "").strip().lower() == "done"
            score, attempts = (table_score, table_attempts) if checked else (None, None)
        else:
            checked = checkbox["checked"]
            if checkbox["score"] is not None:
                # The status line's score token wins when STATUS_SLICE_RE captures it.
                score, attempts = _status_score(checkbox["score"]), checkbox["attempts"]
            elif checked:
                # A closed slice whose status line hides its score behind note: reads the table score.
                score, attempts = table_score, table_attempts
            else:
                # An open slice with no captured score reads as no score, as the checkbox reader did.
                score, attempts = None, None
        envelope: dict[str, Any] = {
            "ends_with": row.ends_with,
            "feature": program,
            "n": row.n,
            "title": row.name,
            "score": score,
        }
        if attempts is not None:
            envelope["attempts"] = attempts
        records.append(
            TrackerRecord(
                id=slice_id,
                kind="slice",
                parent=epic_id if epic_id in epic_ids else None,
                blocked_by=(blocker,) if blocker else (),
                lifecycle="closed" if checked else "open",
                assignee=None,
                envelope=envelope,
                external_ref=slice_id,
            )
        )
        last_in_epic[epic_id] = slice_id
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
                    _epic_and_slice_records(directory.name, slices_path.read_text(encoding="utf-8"), status_text)
                )
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
