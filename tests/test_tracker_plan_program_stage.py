"""A plan's program record takes its stage from the goal.json of its design.

The design is the plan's own name, or else the epic id prefix (renamed: epics `othername/E1`).
Run with: uv run pytest tests/test_tracker_plan_program_stage.py -q
"""
from __future__ import annotations

import shutil
from pathlib import Path
from typing import Any

import _beads_support as support
import _program_stage_support as ps

TREE = support.FIXTURE_DIR / "plans-planstage"
EXPECTED = {
    "shipped": ("implemented", "closed"),
    "retired": ("superseded", "closed"),
    "building": ("approved", "open"),
    "nodesign": (None, "open"),
    "renamed": ("superseded", "closed"),
}


def _plans(tmp: Path) -> Path:
    shutil.copytree(TREE, tmp / "tree")
    return tmp / "tree" / "plans"


def _programs(records: list[Any]) -> dict[str, Any]:
    return {r.id: r for r in records if r.kind == "program"}


def test_files_adapter_programs_take_stage_and_lifecycle(tmp_path: Path) -> None:
    from tracker_port.files import FilesAdapter

    programs = _programs(FilesAdapter(_plans(tmp_path)).all_records())

    got = {k: (v.envelope.get("stage"), v.lifecycle) for k, v in programs.items()}
    assert got == EXPECTED, got
    assert "stage" not in programs["nodesign"].envelope


def test_seed_dry_run_lists_the_stage_programs(tmp_path: Path) -> None:
    created = _programs(ps.fake(tmp_path).seed_from_files(_plans(tmp_path), dry_run=True))

    assert {k: v.envelope.get("stage") for k, v in created.items()} == {k: s for k, (s, _) in EXPECTED.items()}


def test_fake_seed_creates_the_closed_plan_programs_closed(tmp_path: Path) -> None:
    adapter = ps.fake(tmp_path)
    adapter.seed_from_files(_plans(tmp_path))

    life = ps.lifecycles(adapter)
    assert {k: life[k] for k in EXPECTED} == {k: l for k, (_, l) in EXPECTED.items()}


def _seed_open(tmp: Path) -> tuple[Any, Path]:
    adapter = ps.beads(tmp)
    plans = _plans(tmp)
    for design in ("shipped", "building"):
        ps.set_goal_stage(plans, design, "approved")
    adapter.seed_from_files(plans)
    return adapter, plans


def test_real_bd_seed_repair_and_refresh_envelope_for_plan_programs(tmp_path: Path) -> None:
    adapter, plans = _seed_open(tmp_path)
    assert ps.bd_status(adapter, "shipped") == "open"
    adapter.set_program_stage("building", "review")  # a stage set at runtime

    ps.set_goal_stage(plans, "shipped", "implemented")
    ps.set_goal_stage(plans, "building", "implemented")
    adapter.seed_from_files(plans)
    # The repair closes the open program whose design now says implemented.
    assert ps.bd_status(adapter, "shipped") == "closed"
    # Held stage review: the seed must not close it.
    assert ps.bd_status(adapter, "building") == "open"

    adapter.seed_from_files(plans, refresh_envelope=True)
    held = {r.id: r for r in adapter.list_programs()}
    # The held stage is never overwritten. The lifecycle follows the held stage.
    assert held["building"].envelope["stage"] == "review"
    assert held["building"].lifecycle == "open"
    assert ps.bd_status(adapter, "building") == "open"
    # A held stage that is set stays, even when the file says another.
    assert held["shipped"].envelope["stage"] == "approved"


def test_real_bd_refresh_envelope_fills_a_missing_stage(tmp_path: Path) -> None:
    adapter = ps.beads(tmp_path)
    plans = _plans(tmp_path)
    ps.set_goal_stage(plans, "shipped", "implemented")
    adapter.create_record(ps.program("shipped", "approved"))
    held = next(r for r in adapter._rows() if r["metadata"]["cb"]["id"] == "shipped")
    adapter._update(held, block={**held["metadata"]["cb"], "envelope": {}})
    assert "stage" not in {r.id: r for r in adapter.list_programs()}["shipped"].envelope

    adapter.seed_from_files(plans, refresh_envelope=True)

    assert {r.id: r for r in adapter.list_programs()}["shipped"].envelope["stage"] == "implemented"
