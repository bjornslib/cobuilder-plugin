"""Rewrite the state cells of a plan's status files from the tracker records.

The status files are projections of the records. This module reads the records
through the port and rewrites only the gate values, the slice checkboxes, and the
slice table state and score cells. Prose stays byte-identical, so the line count
does not change.
"""

from __future__ import annotations

import re
from collections.abc import Callable
from pathlib import Path

from gate_status import GATE_LINE_RE

from .files import SLICES_FILE, STATUS_FILE
from .port import AdapterError, ArgumentError, NoAdapterError, TrackerPort
from .record import TrackerRecord

# A slice row of the slice table. The first cell holds the slice number.
TABLE_ROW_RE = re.compile(r"^\|\s*\d+\s*\|")
# A slice checkbox line. Group 2 is the box, and group 4 is the slice number.
SLICE_BOX_RE = re.compile(r"^(-\s*\[)(x| )(\]\s*Slice\s*(\d+)\s*[—–-])", re.IGNORECASE)
# The score token and its optional attempt count. The note tail after them stays as it is.
SLICE_SCORE_RE = re.compile(r"(\s+score:\s*)(\S+)((?:\s+on\s+attempt\s+\d+)?)")


def regenerate(port: TrackerPort | None, program: str, plans_dir: Path) -> list[Path]:
    """Rewrite the status files of one program. Return both paths, status file first."""
    if port is None:
        raise NoAdapterError("regenerate needs a tracker adapter. Configure one first.")
    programs = [record for record in port.list_programs() if record.id == program]
    if not programs:
        raise ArgumentError(f"no program with id {program}")
    gates = programs[0].envelope
    by_n = _slices_by_number(port, program)
    plan = plans_dir / program
    status_path = plan / STATUS_FILE
    slices_path = plan / SLICES_FILE
    for path in (status_path, slices_path):
        if not path.is_file():
            raise AdapterError(f"no status file at {path}")
    # Read and compute both files before any write, so a failure leaves both untouched.
    status_text = status_path.read_text(encoding="utf-8")
    slices_text = slices_path.read_text(encoding="utf-8")
    status_new = _rewrite(status_text, lambda line: _status_line(line, gates, by_n))
    slices_new = _rewrite(slices_text, lambda line: _table_row(line, by_n))
    for path, old, new in ((status_path, status_text, status_new), (slices_path, slices_text, slices_new)):
        if new != old:
            path.write_text(new, encoding="utf-8")
    return [status_path, slices_path]


def _slices_by_number(port: TrackerPort, program: str) -> dict[int, TrackerRecord]:
    by_n: dict[int, TrackerRecord] = {}
    for epic in port.list_epics(program):
        for record in port.list_slices(epic.id):
            by_n[record.envelope["n"]] = record
    return by_n


def _rewrite(text: str, transform: Callable[[str], str]) -> str:
    # Apply the transform to each line body and keep its line ending as it was.
    out = []
    for line in text.splitlines(keepends=True):
        body = line.rstrip("\r\n")
        out.append(transform(body) + line[len(body) :])
    return "".join(out)


def _status_line(line: str, gates: dict, by_n: dict[int, TrackerRecord]) -> str:
    gate = GATE_LINE_RE.match(line)
    if gate is not None:
        value = gates.get(f"gate{gate.group(1)}")
        if value is None:
            return line
        return line[: gate.start(3)] + str(value) + line[gate.end(3) :]
    box_match = SLICE_BOX_RE.match(line)
    if box_match is None:
        return line
    record = by_n.get(int(box_match.group(4)))
    if record is None:
        return line
    # The box sits before the score, so splicing the box first leaves the score span valid.
    box = "x" if _closed(record) else " "
    line = line[: box_match.start(2)] + box + line[box_match.end(2) :]
    score = SLICE_SCORE_RE.search(line)
    if score is not None:
        line = line[: score.start(2)] + _status_score(record) + line[score.end(3) :]
    return line


def _table_row(line: str, by_n: dict[int, TrackerRecord]) -> str:
    if TABLE_ROW_RE.match(line) is None:
        return line
    cells = line.split("|")
    record = by_n.get(int(cells[1]))
    if record is None or len(cells) != 8:
        return line
    cells[5] = f" {_table_score(record)} "
    cells[6] = " done " if _closed(record) else " pending "
    return "|".join(cells)


def _closed(record: TrackerRecord) -> bool:
    # An in_progress slice is not closed. It reads as pending, which the files show for open work.
    return record.lifecycle == "closed"


def _score_number(record: TrackerRecord) -> str:
    score = record.envelope.get("score")
    return "—" if score is None else f"{score:g}"


def _status_score(record: TrackerRecord) -> str:
    text = _score_number(record)
    attempts = record.envelope.get("attempts")
    if record.envelope.get("score") is not None and attempts:
        text += f" on attempt {attempts}"
    return text


def _table_score(record: TrackerRecord) -> str:
    text = _score_number(record)
    attempts = record.envelope.get("attempts")
    if record.envelope.get("score") is not None and attempts:
        text += f" (attempt {attempts})"
    return text
