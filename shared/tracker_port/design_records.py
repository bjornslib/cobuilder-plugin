"""Epic and program records that a design's goal.json holds, with no plan table behind them."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .program_state import program_lifecycle
from .record import TrackerRecord

EPIC_STATE_KEYS = ("branch", "pr", "state")
CLOSED_EPIC_STATES = frozenset({"completed", "merged", "accepted", "closed", "done"})


def _goalepic_state(plans_dir: Path, design: str, local_id: str) -> dict[str, Any] | None:
    # The design's goal.json epics[] entry may still hold branch, pr, and state. None means the design
    # has no readable goal.json. A missing entry or key reads as no state. A migration drops the keys.
    path = plans_dir.parent / "architecture" / "designs" / design / "goal.json"
    try:
        goal = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    epics = goal.get("epics") if isinstance(goal, dict) else None
    for entry in epics if isinstance(epics, list) else []:
        if isinstance(entry, dict) and entry.get("id") == local_id:
            return {key: entry[key] for key in EPIC_STATE_KEYS if entry.get(key) is not None}
    return {}


def epic_state(plans_dir: Path, program: str, epic_id: str) -> dict[str, Any]:
    # The design is the epic id prefix, as in "plugin-split/E1". The plan folder name is the fallback
    # when that design has no goal.json.
    design, _, local_id = epic_id.rpartition("/")
    for name in dict.fromkeys((design or program, program)):
        state = _goalepic_state(plans_dir, name, local_id)
        if state is not None:
            return state
    return {}


def design_stage(plans_dir: Path, design: str) -> str | None:
    # The stage word of the design's goal.json. None means no readable goal.json or no stage.
    path = plans_dir.parent / "architecture" / "designs" / design / "goal.json"
    try:
        goal = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    stage = goal.get("stage") if isinstance(goal, dict) else None
    return stage if isinstance(stage, str) else None


def plan_stage(plans_dir: Path, program: str, epics: list[TrackerRecord]) -> str | None:
    # A plan takes its stage from the design of its own name. Else it takes the design that the
    # first epic id prefix names, as in "othername/E1". None means neither design has a stage.
    names = [program, *(epics[0].id.rpartition("/")[0],)] if epics else [program]
    for name in dict.fromkeys(names):
        stage = design_stage(plans_dir, name)
        if stage is not None:
            return stage
    return None


def _epic_lifecycle(state: str) -> str:
    # The goal.json state word sets the lifecycle. In progress has three spellings.
    word = "_".join(state.lower().replace("-", " ").replace("_", " ").split())
    if word in CLOSED_EPIC_STATES:
        return "closed"
    return "in_progress" if word == "in_progress" else "open"


def design_records(plans_dir: Path, emitted: list[TrackerRecord]) -> list[TrackerRecord]:
    # A design with a goal.json epic that holds branch, pr, or state, and that no plan table emitted,
    # becomes an epic record. A design that no plan produced also gets a program record, first.
    held = {record.id for record in emitted}
    programs = {record.id for record in emitted if record.kind == "program"}
    designs_dir = plans_dir.parent / "architecture" / "designs"
    if not designs_dir.is_dir():
        return []
    records: list[TrackerRecord] = []
    for directory in sorted(designs_dir.iterdir()):
        design = directory.name
        if design in programs:
            continue
        try:
            goal = json.loads((directory / "goal.json").read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        entries = goal.get("epics") if isinstance(goal, dict) else None
        epics: list[TrackerRecord] = []
        for entry in entries if isinstance(entries, list) else []:
            if not isinstance(entry, dict) or not isinstance(entry.get("id"), str):
                continue
            state = {key: entry[key] for key in EPIC_STATE_KEYS if entry.get(key) is not None}
            epic_id = f"{design}/{entry['id']}"
            if not state or epic_id in held:
                continue
            lifecycle = _epic_lifecycle(str(state.get("state", "")))
            epics.append(
                TrackerRecord(
                    id=epic_id,
                    kind="epic",
                    parent=design,
                    blocked_by=(),
                    lifecycle=lifecycle,
                    assignee=None,
                    envelope={"epic_id": entry["id"], **state},
                    external_ref=epic_id,
                )
            )
        if not epics:
            continue
        stage = goal.get("stage")
        records.append(
            TrackerRecord(
                id=design,
                kind="program",
                parent=None,
                blocked_by=(),
                lifecycle=program_lifecycle(stage if isinstance(stage, str) else None, ()),
                assignee=None,
                envelope={"stage": stage} if isinstance(stage, str) else {},
                external_ref=design,
            )
        )
        records.extend(epics)
    return records
