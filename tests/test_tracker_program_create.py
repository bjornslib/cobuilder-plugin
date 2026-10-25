"""Slice 32, step 2: writes refuse duplicate cb ids, and the doctor lists them.

The rows come from the recorded run map-read.json. No bd is needed.

Run with: uv run pytest tests/test_tracker_program_create.py -q
"""
from __future__ import annotations

import copy
import json
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


# --- a live duplicate create makes the next stage write refuse ----------------------------------


@pytest.mark.slow
def test_real_bd_two_creates_then_a_write_refuses(tmp_path: Any) -> None:
    # The spike (/tmp/e8-spike.md, S9) showed that a second create that bypasses
    # the guard, as a clone that has not synced does, makes two rows for one cb
    # id. The next stage write must refuse and name both bd ids.
    import json

    import _program_stage_support as ps
    from tracker_port.port import AdapterError

    support.require_bd()
    plans = _mapped_plans(tmp_path)
    adapter = ps.beads(tmp_path)

    adapter.set_program_stage("mapped", "approved", plans)
    adapter.set_program_stage("mapped", "approved", plans)

    rows = json.loads(adapter.runner.run(["list", "--json", "--all"]))
    held = [row for row in rows if row["metadata"]["cb"]["id"] == "mapped"]
    assert len(held) == 1, f"expected one program row, bd holds {len(held)}"

    # The raw create replays the argv of the first create, so the second row
    # copies the metadata.cb of the first one (same cb id, same kind).
    create = next(call for call in adapter.runner.calls if call[0] == "create")
    adapter.runner.run(create)
    rows = json.loads(adapter.runner.run(["list", "--json", "--all"]))
    duplicates = sorted(row["id"] for row in rows if row["metadata"]["cb"]["id"] == "mapped")
    assert len(duplicates) == 2, f"the raw create made no duplicate: {duplicates}"

    with pytest.raises(AdapterError) as excinfo:
        adapter.set_program_stage("mapped", "decided", plans)

    message = str(excinfo.value)
    assert duplicates[0] in message and duplicates[1] in message, message


# --- a seed over a held program creates no second program row -----------------------------------


class _SeedRunner:
    """Answers the list read with fixed rows, the ref lookups with none, and the writes with ok.

    A create returns a fresh bd id, and the next list read carries the new row,
    as real bd does. This lets the seed find the parent it just created.
    """

    def __init__(self, rows: list[dict[str, Any]]) -> None:
        self.rows = rows
        self.calls: list[list[str]] = []
        self._next = 0

    def run(self, args: list[str]) -> str:
        from tracker_port.beads import LIST_ARGS

        self.calls.append(list(args))
        if list(args) == LIST_ARGS:
            return _json(self.rows)
        if args[0] == "list":  # the ref lookup of a create
            return "[]"
        if args[0] == "create":
            self._next += 1
            bd_id = f"t-new{self._next}"
            block = support.metadata_arg(args)["cb"]
            self.rows.append(
                {
                    "id": bd_id,
                    "status": "open",
                    "external_ref": next(
                        (args[i + 1] for i, flag in enumerate(args) if flag == "--external-ref"), None
                    ),
                    "metadata": {"cb": block},
                }
            )
            return f"{bd_id}\n"
        return ""  # each dep add, close, and the sync


def _held_rows() -> list[dict[str, Any]]:
    """The plan tree's building program, held in the tracker. Its epic and slice are not held."""
    rows = m.native_rows()
    by_cb = {row["metadata"]["cb"]["id"]: copy.deepcopy(row) for row in rows}
    program = by_cb["mapdemo"]
    program["id"] = "t-p"
    program["metadata"]["cb"] = {"v": 1, "id": "building", "kind": "program", "envelope": {"stage": "approved"}}
    program["external_ref"] = "building"
    return [program]


def _held_plans(tmp_path: Any) -> Any:
    """Copy the plans-planstage tree, but keep only the held plan and its design."""
    import shutil
    from pathlib import Path

    tree = support.FIXTURE_DIR / "plans-planstage"
    root = Path(tmp_path) / "tree"
    (root / "plans").mkdir(parents=True)
    shutil.copytree(tree / "plans" / "building", root / "plans" / "building")
    (root / "architecture" / "designs").mkdir(parents=True)
    shutil.copytree(tree / "architecture" / "designs" / "building", root / "architecture" / "designs" / "building")
    return root / "plans"


def test_seed_over_a_held_program_creates_no_second_program_row(tmp_path: Any) -> None:
    from tracker_port.beads import BeadsAdapter

    runner = _SeedRunner(_held_rows())
    adapter = BeadsAdapter(runner)

    creates = adapter.seed_from_files(_held_plans(tmp_path))

    created = [support.metadata_arg(call)["cb"] for call in runner.calls if call[0] == "create"]
    # The seed creates the epic and the slice. The held program row stays alone.
    assert [block["id"] for block in created] == ["building/E1", "building/1"], created
    assert all(block["kind"] != "program" for block in created), created
    assert sorted(record.id for record in creates) == ["building/1", "building/E1"]
    programs = [block for block in created if block["kind"] == "program"]
    assert programs == [], f"the seed created a program row: {programs}"


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
