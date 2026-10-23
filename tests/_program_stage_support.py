"""Shared helpers for the duplicate-epic and program-stage tests. Not a test module."""
from __future__ import annotations

import json
import shutil
from pathlib import Path
from typing import Any

import _beads_support as support
import _inprogress_support as ip

FIXTURES = support.FIXTURE_DIR
PLANS_REAL = FIXTURES / "plans-real"
STAGE_TREE = FIXTURES / "plans-stage"
CORPUS_DIR = FIXTURES / "corpus"


def plans_root(tmp: Path, *names: str) -> Path:
    """Copy the named plans-real fixtures under tmp. Return the plans dir."""
    root = tmp / "plans"
    root.mkdir()
    for name in names:
        shutil.copytree(PLANS_REAL / name, root / name)
    return root


def stage_tree(tmp: Path) -> Path:
    """Copy the plans-stage tree under tmp. Return the plans dir. Its designs hold goal.json stages."""
    tree = tmp / "tree"
    shutil.copytree(STAGE_TREE, tree)
    return tree / "plans"


def set_goal_stage(plans: Path, design: str, stage: str) -> None:
    path = plans.parent / "architecture" / "designs" / design / "goal.json"
    goal = json.loads(path.read_text(encoding="utf-8"))
    path.write_text(json.dumps({**goal, "stage": stage}), encoding="utf-8")


def beads(tmp: Path) -> Any:
    """A real-bd adapter in a scratch tracker. It records each bd call in `runner.calls`."""
    support.require_bd()
    return ip.beads_adapter(tmp, ip.CountingRunner)


def fake(tmp: Path) -> Any:
    from tracker_port.fake import FakeAdapter

    return FakeAdapter(CORPUS_DIR, state_file=tmp / "state.json")


def lifecycles(adapter: Any, kind: str = "program") -> dict[str, str]:
    records = adapter.list_programs() if kind == "program" else adapter.list_epics()
    return {record.id: record.lifecycle for record in records}


def program(id: str, stage: str) -> Any:
    from tracker_port.record import TrackerRecord

    return TrackerRecord(
        id=id, kind="program", parent=None, blocked_by=(), lifecycle="open",
        assignee=None, envelope={"stage": stage}, external_ref=None,
    )


def epic(id: str, parent: str) -> Any:
    from tracker_port.record import TrackerRecord

    return TrackerRecord(
        id=id, kind="epic", parent=parent, blocked_by=(), lifecycle="open",
        assignee=None, envelope={}, external_ref=None,
    )


def bd_status(adapter: Any, cb_id: str) -> str:
    """The native bd status of the issue with this cb id."""
    return next(row["status"] for row in adapter._rows() if row["metadata"]["cb"]["id"] == cb_id)
