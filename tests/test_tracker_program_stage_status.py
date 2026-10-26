"""A program's stage maps to its bd status, on the fake adapter, real bd, and the seed.

Rule: a program is closed when envelope.stage is implemented or superseded. Otherwise the epic-derived
rule of program_state holds (in_progress if any epic is in progress, closed if all are closed, else open).
The stage wins over the epics. Real-bd tests run in a scratch tracker only.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest

import _program_stage_support as ps
from _tracker_contract_support import adapter, build, corpus  # noqa: F401  (fixtures)

BD_CLOSED = "closed"


def _stage(adapter: Any, stage: str, program: str = "demo") -> None:
    adapter.set_program_stage(program, stage)


def _life(adapter: Any, program: str = "demo") -> str:
    return ps.lifecycles(adapter)[program]


# --- set-program-stage, fake and real bd (contract corpus: demo has three open epics) ----------


def test_superseded_closes_the_program_and_approved_reopens_it(adapter: Any) -> None:
    _stage(adapter, "approved")
    assert _life(adapter) == "open"

    _stage(adapter, "superseded")
    assert _life(adapter) == "closed", "superseded did not close the program"

    _stage(adapter, "approved")
    assert _life(adapter) == "open", "approved did not reopen the program by the epic-derived rule"


def test_implemented_closes_the_program(adapter: Any) -> None:
    _stage(adapter, "implemented")

    assert _life(adapter) == "closed"


@pytest.mark.parametrize("stage", ["backlog", "decided", "approved", "review"])
def test_a_live_stage_keeps_the_program_open_when_every_epic_is_open(adapter: Any, stage: str) -> None:
    _stage(adapter, stage)

    assert _life(adapter) == "open"


def test_reopening_from_superseded_follows_an_in_progress_epic(adapter: Any) -> None:
    adapter.set_epic_state("demo-E1", "in_progress")
    _stage(adapter, "superseded")
    assert _life(adapter) == "closed"

    _stage(adapter, "approved")

    assert _life(adapter) == "in_progress"


def test_reopening_from_implemented_with_all_epics_closed_closes_it_again(adapter: Any) -> None:
    for epic in ("demo-E1", "demo-E2", "demo-E3"):
        adapter.set_epic_state(epic, "closed")
    _stage(adapter, "implemented")

    _stage(adapter, "approved")

    assert _life(adapter) == "closed", "all epics are closed, so the epic-derived rule closes the program"


def test_stage_wins_over_an_epic_going_in_progress(adapter: Any) -> None:
    # Pinned decision: a program at stage implemented stays closed while an epic goes in progress.
    _stage(adapter, "implemented")
    assert _life(adapter) == "closed"

    adapter.set_epic_state("demo-E1", "in_progress")

    assert _life(adapter) == "closed", "the epic change reopened an implemented program: the stage must win"
    assert {r.id: r.lifecycle for r in adapter.list_epics()}["demo-E1"] == "in_progress"


def test_stage_wins_for_superseded_when_every_epic_closes_or_reopens(adapter: Any) -> None:
    _stage(adapter, "superseded")

    adapter.set_epic_state("demo-E1", "in_progress")
    adapter.set_epic_state("demo-E1", "open")

    assert _life(adapter) == "closed"


# --- real bd: the native status and the call counts ----------------------------------------------


def _scratch(tmp: Path, stage: str = "approved") -> Any:
    adapter = ps.beads(tmp)
    adapter.create_record(ps.program("prog", stage))
    adapter.create_record(ps.epic("prog/E1", "prog"))
    adapter.create_record(ps.epic("prog/E2", "prog"))
    return adapter


@pytest.mark.slow
def test_real_bd_create_at_stage_approved_is_open_and_at_implemented_is_closed(tmp_path: Path) -> None:
    adapter = ps.beads(tmp_path)
    adapter.create_record(ps.program("live", "approved"))
    adapter.create_record(ps.program("done", "implemented"))

    assert ps.bd_status(adapter, "live") == "open"
    assert ps.bd_status(adapter, "done") == BD_CLOSED, "a program created at stage implemented stays open in bd"


@pytest.mark.slow
def test_real_bd_stage_changes_write_the_native_bd_status(tmp_path: Path) -> None:
    adapter = _scratch(tmp_path)
    assert ps.bd_status(adapter, "prog") == "open"

    adapter.set_program_stage("prog", "superseded")
    assert ps.bd_status(adapter, "prog") == BD_CLOSED
    adapter.set_program_stage("prog", "approved")
    assert ps.bd_status(adapter, "prog") == "open"


@pytest.mark.slow
def test_real_bd_stage_wins_over_an_epic_going_in_progress(tmp_path: Path) -> None:
    adapter = _scratch(tmp_path)
    adapter.set_program_stage("prog", "implemented")

    adapter.set_epic_state("prog/E1", "in_progress")

    assert ps.bd_status(adapter, "prog") == BD_CLOSED
    assert ps.lifecycles(adapter)["prog"] == "closed"


@pytest.mark.slow
def test_real_bd_set_program_stage_writes_status_only_on_a_change_with_one_sync(tmp_path: Path) -> None:
    adapter = _scratch(tmp_path)
    program_bd_id = next(r["id"] for r in adapter._rows() if r["metadata"]["cb"]["id"] == "prog")

    def status_writes() -> list[list[str]]:
        return [c for c in adapter.runner.calls if c[:2] == ["update", program_bd_id] and "--status" in c]

    adapter.runner.calls.clear()
    adapter.set_program_stage("prog", "approved")
    assert status_writes() == [], "an unchanged lifecycle wrote a status"
    assert adapter.runner.count("sync") == 1

    adapter.runner.calls.clear()
    adapter.set_program_stage("prog", "superseded")
    assert len(status_writes()) == 1, adapter.runner.calls
    assert adapter.runner.count("sync") == 1, adapter.runner.calls

    adapter.runner.calls.clear()
    adapter.set_program_stage("prog", "implemented")
    assert status_writes() == [], "closed to closed wrote a status"
    assert adapter.runner.count("sync") == 1


# --- files adapter and seed -----------------------------------------------------------------------


def test_files_adapter_lifecycle_follows_the_goal_stage(tmp_path: Path) -> None:
    from tracker_port.files import FilesAdapter

    life = ps.lifecycles(FilesAdapter(ps.stage_tree(tmp_path)))

    assert life == {"shipped": "closed", "retired": "closed", "building": "open"}, life


def test_fake_seed_creates_implemented_and_superseded_programs_closed(tmp_path: Path) -> None:
    adapter = ps.fake(tmp_path)
    adapter.seed_from_files(ps.stage_tree(tmp_path))

    life = ps.lifecycles(adapter)
    assert {k: life[k] for k in ("shipped", "retired", "building")} == {
        "shipped": "closed", "retired": "closed", "building": "open",
    }


@pytest.mark.slow
def test_real_bd_seed_creates_implemented_and_superseded_programs_closed(tmp_path: Path) -> None:
    adapter = ps.beads(tmp_path)
    adapter.seed_from_files(ps.stage_tree(tmp_path))

    assert {p: ps.bd_status(adapter, p) for p in ("shipped", "retired", "building")} == {
        "shipped": BD_CLOSED, "retired": BD_CLOSED, "building": "open",
    }


@pytest.mark.slow
def test_real_bd_seed_repairs_an_open_program_whose_files_now_say_closed(tmp_path: Path) -> None:
    adapter = ps.beads(tmp_path)
    plans = ps.stage_tree(tmp_path)
    ps.set_goal_stage(plans, "shipped", "approved")
    adapter.seed_from_files(plans)
    assert ps.bd_status(adapter, "shipped") == "open"

    ps.set_goal_stage(plans, "shipped", "implemented")
    adapter.seed_from_files(plans)

    assert ps.bd_status(adapter, "shipped") == BD_CLOSED, "the seed repair left an implemented program open"
    assert ps.bd_status(adapter, "building") == "open"
