"""Slice 16 follow-up: the files adapter reads goal.json epics of designs that have no plan."""

from __future__ import annotations

import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO / "shared"))

FIXTURES = REPO / "tests" / "fixtures" / "tracker"
TREE = FIXTURES / "plans-designs"
PLANS_DIR = TREE / "plans"
CORPUS_DIR = FIXTURES / "corpus"


def _records() -> dict[str, object]:
    from tracker_port.files import FilesAdapter

    return {record.id: record for record in FilesAdapter(PLANS_DIR).all_records()}


def test_planless_design_epics_become_records() -> None:
    records = _records()

    done = records["orphan/E1"]
    assert done.kind == "epic"
    assert done.parent == "orphan"
    assert done.lifecycle == "closed"
    assert done.external_ref == "orphan/E1"
    assert done.envelope == {"epic_id": "E1", "branch": "feature/orphan-e1", "pr": 7, "state": "completed"}

    planned = records["orphan/E2"]
    assert planned.lifecycle == "open"
    assert planned.envelope == {"epic_id": "E2", "state": "planned"}


def test_planless_design_gets_a_program_record() -> None:
    program = _records()["orphan"]

    assert program.kind == "program"
    assert program.parent is None
    assert program.lifecycle == "open"
    assert program.envelope == {"stage": "design"}
    assert program.external_ref == "orphan"


def test_design_matching_a_plan_adds_no_duplicate() -> None:
    from tracker_port.files import FilesAdapter

    ids = [record.id for record in FilesAdapter(PLANS_DIR).all_records()]

    assert ids.count("alpha") == 1
    assert ids.count("alpha/E1") == 1


def test_epics_without_state_keys_emit_nothing() -> None:
    records = _records()

    assert not any(key == "quiet" or key.startswith("quiet/") for key in records)
    assert not any(key.startswith("decoy") for key in records)


def test_seed_creates_them_programs_first_then_nothing_on_rerun() -> None:
    from tracker_port.fake import FakeAdapter

    adapter = FakeAdapter(CORPUS_DIR)
    creates = adapter.seed_from_files(PLANS_DIR)
    ids = [record.id for record in creates]

    assert {"orphan", "orphan/E1", "orphan/E2"} <= set(ids)
    assert ids.index("orphan") < ids.index("orphan/E1")
    assert ids.index("orphan") < ids.index("orphan/E2")
    assert adapter.seed_from_files(PLANS_DIR) == []


def test_dry_run_lists_them() -> None:
    from tracker_port.fake import FakeAdapter

    creates = FakeAdapter(CORPUS_DIR).seed_from_files(PLANS_DIR, dry_run=True)

    assert {"orphan", "orphan/E1", "orphan/E2"} <= {record.id for record in creates}
