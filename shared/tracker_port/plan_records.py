"""Plan records. They come from a program's 00-status.md and 04-slices.md."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from gate_status import approved_date, parse_gate4_substeps, parse_status_gates
from slice_table import parse_header_epic_id, parse_row, parse_table

from .design_records import epic_state
from .port import AdapterError
from .record import TrackerRecord

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



def _slice_lifecycle(checked: bool, state: str | None) -> str:
    # A checked box closes the slice. Otherwise a table State cell such as "In Progress" starts it.
    if checked:
        return "closed"
    return "in_progress" if re.sub(r"[\s_-]+", "_", (state or "").strip().lower()) == "in_progress" else "open"


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


# The program envelope keys that verify_gate reads when the tracker is not files:
#   gate<n>      the gate state text, such as "APPROVED 2026-09-14"
#   gate_view_<n> the gate's view route, or "" when the gate has no view line.
#                Written only for an approved gate with a date, the one kind that needs a link.
#   gate4a/4b/4c the Gate 4 sub-line state, written only when the sub-line exists.
def _program_record(directory: Path, status_text: str) -> TrackerRecord:
    program = directory.name
    envelope: dict[str, str] = {}
    for gate in parse_status_gates(status_text):
        envelope[f"gate{gate['n']}"] = gate["state"]
        if approved_date(gate["state"]) is not None:
            envelope[f"gate_view_{gate['n']}"] = gate["view"] or ""
    for step, state in parse_gate4_substeps(status_text).items():
        envelope[f"gate{step}"] = state
    return TrackerRecord(
        id=program,
        kind="program",
        parent=None,
        blocked_by=(),
        lifecycle="open",
        assignee=None,
        envelope=envelope,
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


def _epic_and_slice_records(
    program: str, text: str, status_text: str, plans_dir: Path | None = None
) -> list[TrackerRecord]:
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
            envelope={
                "epic_id": epic_id.rsplit("/", 1)[-1],
                **(epic_state(plans_dir, program, epic_id) if plans_dir else {}),
            },
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
                lifecycle=_slice_lifecycle(checked, row.state),
                assignee=None,
                envelope=envelope,
                external_ref=slice_id,
            )
        )
        last_in_epic[epic_id] = slice_id
    return records
