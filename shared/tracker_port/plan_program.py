"""The program record of a plan. It holds the gate values from 00-status.md and the stage of the design."""

from __future__ import annotations

from collections.abc import Sequence
from pathlib import Path

from gate_status import approved_date, parse_gate4_substeps, parse_status_gates

from .plan_texts import program_texts
from .program_state import program_lifecycle
from .record import TrackerRecord

# The program envelope keys that verify_gate reads when the tracker is not files:
#   gate<n>      the gate state text, such as "APPROVED 2026-09-14"
#   gate_view_<n> the gate's view route, or "" when the gate has no view line.
#                Written only for an approved gate with a date, the one kind that needs a link.
#   gate4a/4b/4c the Gate 4 sub-line state, written only when the sub-line exists.
def _program_record(
    directory: Path, status_text: str, stage: str | None = None, epics: Sequence[TrackerRecord] = ()
) -> TrackerRecord:
    program = directory.name
    envelope: dict[str, str] = {}
    for gate in parse_status_gates(status_text):
        envelope[f"gate{gate['n']}"] = gate["state"]
        if approved_date(gate["state"]) is not None:
            envelope[f"gate_view_{gate['n']}"] = gate["view"] or ""
    for step, state in parse_gate4_substeps(status_text).items():
        envelope[f"gate{step}"] = state
    if stage is not None:
        envelope["stage"] = stage
    return TrackerRecord(
        id=program,
        kind="program",
        parent=None,
        blocked_by=(),
        lifecycle=program_lifecycle(stage, epics),
        assignee=None,
        envelope=envelope,
        external_ref=program,
        **program_texts(directory.parent, program),
    )
