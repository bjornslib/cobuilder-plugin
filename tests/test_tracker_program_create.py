"""Slice 32, step 2: writes refuse duplicate cb ids, and the doctor lists them.

The rows come from the recorded run map-read.json. No bd is needed.

Run with: uv run pytest tests/test_tracker_program_create.py -q
"""
from __future__ import annotations

import copy
from typing import Any

import pytest

import _beads_mapping_support as m
import _beads_support as support


class _ListRunner:
    """Answers the list read with fixed rows and records every call. Any other call fails the test."""

    def __init__(self, rows: list[dict[str, Any]]) -> None:
        self.rows = rows
        self.calls: list[list[str]] = []

    def run(self, args: list[str]) -> str:
        from tracker_port.beads import LIST_ARGS

        self.calls.append(list(args))
        if list(args) != LIST_ARGS:
            raise AssertionError(f"unexpected bd call {args}: only the list read is allowed here")
        return _json(self.rows)


def _json(rows: list[dict[str, Any]]) -> str:
    import json

    return json.dumps(rows)


def _duplicate_rows() -> list[dict[str, Any]]:
    """The program row twice, with the bd ids t-1 and t-2 and the same cb id."""
    rows = m.native_rows()
    program = m.row_of("mapdemo", rows)
    copy_row = copy.deepcopy(program)
    copy_row["id"] = "t-2"
    program["id"] = "t-1"
    return [program, copy_row]


def test_a_write_refuses_when_two_rows_hold_one_cb_id() -> None:
    from tracker_port.port import AdapterError

    runner = _ListRunner(_duplicate_rows())
    adapter = _adapter(runner)

    with pytest.raises(AdapterError) as excinfo:
        adapter.set_program_stage("mapdemo", "approved")

    message = str(excinfo.value)
    assert "t-1" in message and "t-2" in message, message
    assert runner.calls == [_list_call()], runner.calls


def _adapter(runner: Any) -> Any:
    from tracker_port.beads import BeadsAdapter

    return BeadsAdapter(runner)


def _list_call() -> list[str]:
    from tracker_port.beads import LIST_ARGS

    return list(LIST_ARGS)


def test_doctor_lists_the_duplicate_ids() -> None:
    adapter, _ = support.list_adapter(_duplicate_rows())

    assert adapter.doctor_details()["duplicates"] == ["mapdemo"]

    clean_adapter, _ = support.list_adapter(m.native_rows())

    assert clean_adapter.doctor_details()["duplicates"] == []


# --- a stage write with no program row creates the program from the plan texts -----------------


def _create_runner() -> Any:
    """A runner that answers the list read with no cb rows, the ref lookups, and one create."""
    from tracker_port.beads import LIST_ARGS

    class _Runner:
        def __init__(self) -> None:
            self.calls: list[list[str]] = []

        def run(self, args: list[str]) -> str:
            self.calls.append(list(args))
            if list(args) == LIST_ARGS:
                return "[]"
            if args[0] == "list":  # the ref lookup
                return "[]"
            if args[0] == "create":
                return "t-new\n"
            if args[0] == "sync":
                return "ok"
            raise AssertionError(f"unexpected bd call {args}")

    return _Runner()


def _mapped_plans(tmp_path: Any) -> Any:
    import shutil
    from pathlib import Path

    root = tmp_path / "tree"
    shutil.copytree(support.FIXTURE_DIR / "plans-mapping", root)
    return root / "plans"


def test_a_missing_program_row_creates_the_program_from_the_plan_texts(tmp_path: Any) -> None:
    from tracker_port.beads import BeadsAdapter
    from tracker_port.port import ArgumentError

    plans = _mapped_plans(tmp_path)
    runner = _create_runner()

    record = BeadsAdapter(runner).set_program_stage("mapped", "approved", plans)

    assert record.id == "mapped" and record.kind == "program"
    assert record.envelope == {"stage": "approved"}
    assert record.external_ref == "mapped"
    assert record.title == "Mapped program title"
    assert record.description == "The mapped program outcome."
    assert record.acceptance_criteria == "First done\nSecond done"
    assert record.design == "tree/architecture/designs/mapped"
    creates = [call for call in runner.calls if call[0] == "create"]
    assert len(creates) == 1
    assert "--external-ref" in creates[0]


def test_a_missing_program_row_without_goal_json_is_refused(tmp_path: Any) -> None:
    from tracker_port.beads import BeadsAdapter
    from tracker_port.port import ArgumentError

    plans = _mapped_plans(tmp_path)
    (plans.parent / "architecture" / "designs" / "ghost").mkdir(parents=True)

    with pytest.raises(ArgumentError, match="no goal.json at"):
        BeadsAdapter(_create_runner()).set_program_stage("ghost", "approved", plans)


def test_a_missing_program_row_without_plans_dir_still_refuses() -> None:
    from tracker_port.beads import BeadsAdapter
    from tracker_port.port import ArgumentError

    with pytest.raises(ArgumentError, match="no record with id mapped"):
        BeadsAdapter(_ListRunner([])).set_program_stage("mapped", "approved")


@pytest.mark.slow
def test_a_stage_write_on_a_held_program_row_ignores_plans_dir(tmp_path: Any) -> None:
    # The held program row exists, so the write updates it. A nonexistent plans
    # dir would fail any text read, which proves the write ignores it.
    import _program_stage_support as ps

    support.require_bd()
    adapter = ps.beads(tmp_path)
    adapter.create_record(ps.program("prog", "approved"))
    adapter.set_program_stage("prog", "superseded", tmp_path / "does-not-exist" / "plans")

    assert ps.bd_status(adapter, "prog") == "closed"


def test_a_stage_write_on_a_wrong_kind_row_ignores_plans_dir(tmp_path: Any) -> None:
    from tracker_port.beads import BeadsAdapter
    from tracker_port.port import ArgumentError

    # `mapdemo/1` is a slice. The kind refusal must re-raise even with a plans dir.
    with pytest.raises(ArgumentError, match="not one of"):
        BeadsAdapter(_ListRunner(m.native_rows())).set_program_stage(
            "mapdemo/1", "approved", _mapped_plans(tmp_path)
        )


# --- the fake adapter creates a missing program the same way ------------------------------------


def test_the_fake_creates_a_missing_program_from_the_plan_texts(tmp_path: Any) -> None:
    import _program_stage_support as ps
    from tracker_port.fake import FakeAdapter

    plans = _mapped_plans(tmp_path)
    adapter = FakeAdapter(ps.CORPUS_DIR, state_file=tmp_path / "state.json")

    record = adapter.set_program_stage("mapped", "approved", plans)

    assert record.id == "mapped" and record.kind == "program"
    assert record.envelope == {"stage": "approved"}
    assert record.external_ref == "mapped"
    assert record.title == "Mapped program title"
    assert record.description == "The mapped program outcome."
    assert record.acceptance_criteria == "First done\nSecond done"
    # A second read finds the record in the held state.
    held = next(r for r in adapter.list_programs() if r.id == "mapped")
    assert held.envelope == {"stage": "approved"}


def test_the_fake_without_plans_dir_keeps_the_current_error(tmp_path: Any) -> None:
    import _program_stage_support as ps
    from tracker_port.fake import FakeAdapter
    from tracker_port.port import ArgumentError

    adapter = FakeAdapter(ps.CORPUS_DIR, state_file=tmp_path / "state.json")
    with pytest.raises(ArgumentError, match="no program with id mapped"):
        adapter.set_program_stage("mapped", "approved")
