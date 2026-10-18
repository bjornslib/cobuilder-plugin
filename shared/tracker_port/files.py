"""The files adapter. It reads the plans tree and refuses every write.

A plans tree holds one directory per program. Each directory has a
``00-status.md`` gate table and a ``04-slices.md`` slice table. This adapter
projects that tree to the record shape that the fake adapter uses. It never
calls ``bd``.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, NoReturn

from gate_status import parse_status_gates
from slice_table import parse_table

from .port import AdapterError, ArgumentError, NoAdapterError
from .record import Capabilities, TrackerRecord

STATUS_FILE = "00-status.md"
SLICES_FILE = "04-slices.md"
DONE_STATE = "done"


def _refuse(self: object, *args: Any, **kwargs: Any) -> NoReturn:
    raise NoAdapterError("the files adapter reads state and writes none. Configure a tracker adapter to write.")


def _score(cell: str | None) -> float | None:
    if not cell or cell == "\u2014":
        return None
    try:
        return float(cell)
    except ValueError as exc:
        raise AdapterError(f"score cell is not a number: {cell!r}") from exc


def _program_records(directory: Path) -> list[TrackerRecord]:
    program = directory.name
    gates = parse_status_gates((directory / STATUS_FILE).read_text(encoding="utf-8"))
    records = [
        TrackerRecord(
            id=program,
            kind="program",
            parent=None,
            blocked_by=(),
            lifecycle="open",
            assignee=None,
            envelope={f"gate{gate['n']}": gate["state"] for gate in gates},
            external_ref=program,
        )
    ]
    slices_path = directory / SLICES_FILE
    if slices_path.is_file():
        records.extend(_epic_and_slice_records(program, slices_path.read_text(encoding="utf-8")))
    return records


def _epic_and_slice_records(program: str, text: str) -> list[TrackerRecord]:
    table = parse_table(text)
    if table.unparsed:
        raise AdapterError(f"{program} has slice rows the parser cannot read: {table.unparsed}")
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
            raise AdapterError(f"slice {row.n} names epic {row.epic_id!r}, which has no epic header row")
        slice_id = f"{program}/{row.n}"
        if slice_id in slice_ids:
            raise AdapterError(f"slice id {slice_id} appears twice")
        slice_ids.add(slice_id)
        blocker = last_in_epic.get(row.epic_id)
        records.append(
            TrackerRecord(
                id=slice_id,
                kind="slice",
                parent=row.epic_id,
                blocked_by=(blocker,) if blocker else (),
                lifecycle="closed" if row.state == DONE_STATE else "open",
                assignee=None,
                envelope={
                    "ends_with": row.ends_with,
                    "feature": program,
                    "n": row.n,
                    "score": _score(row.score),
                },
                external_ref=slice_id,
            )
        )
        last_in_epic[row.epic_id] = slice_id
    return records


class FilesAdapter:
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

    def all_records(self) -> list[TrackerRecord]:
        records: list[TrackerRecord] = []
        for directory in sorted(self._plans_dir.iterdir()):
            if (directory / STATUS_FILE).is_file():
                records.extend(_program_records(directory))
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
