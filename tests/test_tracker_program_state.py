"""A set-epic-state recomputes the stored lifecycle of the epic's program, on every adapter.

Rule: in_progress when one epic is in_progress; else closed when the program has epics and all
are closed; else open. The program stage stays untouched.

Run with: uv run pytest tests/test_tracker_program_state.py -q
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import _inprogress_support as ip
import _tracker_cli_support as cli_support
import _beads_support as support
from _program_state_support import (
    add_epics, bd_id, program_lifecycle as lifecycle, set_states, status_updates,
)

pytest_plugins = ["_tracker_contract_support"]


def test_epic_in_progress_makes_program_in_progress_and_back_to_open(adapter: Any) -> None:
    assert lifecycle(adapter) == "open"
    adapter.set_epic_state("demo-E1", "in_progress")
    assert lifecycle(adapter) == "in_progress"
    adapter.set_epic_state("demo-E1", "open")
    assert lifecycle(adapter) == "open"


def test_program_closes_only_when_every_epic_is_closed(adapter: Any) -> None:
    set_states(adapter, demo_E1="closed", demo_E2="closed")
    assert lifecycle(adapter) == "open", "E3 is still open"
    set_states(adapter, demo_E3="closed")
    assert lifecycle(adapter) == "closed"


def test_one_in_progress_epic_beats_closed_epics(adapter: Any) -> None:
    set_states(adapter, demo_E1="closed", demo_E2="in_progress")
    assert lifecycle(adapter) == "in_progress"


def test_reopening_an_epic_reopens_a_closed_program(adapter: Any) -> None:
    set_states(adapter, demo_E1="closed", demo_E2="closed", demo_E3="closed")
    assert lifecycle(adapter) == "closed"
    adapter.set_epic_state("demo-E2", "open")
    assert lifecycle(adapter) == "open"


def test_program_stage_and_envelope_stay_untouched(adapter: Any) -> None:
    before = dict(adapter.list_programs()[0].envelope)
    set_states(adapter, demo_E1="in_progress", demo_E2="closed")
    assert dict(adapter.list_programs()[0].envelope) == before


def test_epic_without_a_parent_writes_nothing_extra_and_does_not_fail(
    build: Any, corpus: Path
) -> None:
    add_epics(corpus, {"id": "demo-orphan", "parent": None})
    adapter = build(corpus)

    record = adapter.set_epic_state("demo-orphan", "in_progress")

    assert record.lifecycle == "in_progress"
    assert lifecycle(adapter) == "open"


def test_fake_epic_whose_parent_is_missing_does_not_fail(corpus: Path) -> None:
    from tracker_port.fake import FakeAdapter

    add_epics(corpus, {"id": "ghost-E1", "parent": "ghost"})
    adapter = FakeAdapter(corpus)

    assert adapter.set_epic_state("ghost-E1", "closed").lifecycle == "closed"
    assert lifecycle(adapter) == "open"


def test_second_identical_set_does_not_write_the_program_again(build: Any, corpus: Path) -> None:
    adapter = build(corpus)
    program_writes: list[str] = []
    if adapter.name == "fake":
        original = adapter._update
        adapter._update = lambda id, kind, **kw: (program_writes.append(id) if kind == "program" else None) or original(id, kind, **kw)
    else:
        adapter.runner = ip.CountingRunner(adapter.runner)
    target = bd_id(adapter, "demo") if adapter.name == "beads" else "demo"

    adapter.set_epic_state("demo-E1", "in_progress")
    first = len(program_writes) if adapter.name == "fake" else len(status_updates(adapter.runner, target))
    adapter.set_epic_state("demo-E1", "in_progress")
    second = len(program_writes) if adapter.name == "fake" else len(status_updates(adapter.runner, target))

    assert first == 1, "the first transition writes the program once"
    assert second == first, "an identical second set writes the program again"


# --- beads only: the bd calls --------------------------------------------------


def _scratch(tmp: Path) -> Any:
    from tracker_port.record import TrackerRecord

    adapter = ip.beads_adapter(tmp, ip.CountingRunner)

    def make(id: str, kind: str, parent: str | None = None, blocked_by: tuple[str, ...] = ()) -> None:
        adapter.create_record(TrackerRecord(
            id=id, kind=kind, parent=parent, blocked_by=blocked_by, lifecycle="open",
            assignee=None, envelope={"stage": "design"} if kind == "program" else {}, external_ref=None,
        ))

    make("blocker", "slice")
    make("prog", "program", blocked_by=("blocker",))
    make("prog/E1", "epic", parent="prog")
    make("prog/E2", "epic", parent="prog")
    return adapter


def test_real_bd_program_follows_its_epics_through_three_transitions(tmp_path: Path) -> None:
    support.require_bd()
    adapter = _scratch(tmp_path)
    prog = {r.id: r for r in adapter.list_programs()}

    adapter.set_epic_state("prog/E1", "in_progress")
    assert lifecycle(adapter, "prog") == "in_progress"
    adapter.set_epic_state("prog/E1", "open")
    assert lifecycle(adapter, "prog") == "open"
    adapter.runner.calls.clear()
    adapter.set_epic_state("prog/E1", "closed")
    adapter.set_epic_state("prog/E2", "closed")
    # The program has an open blocker, and the close must still succeed.
    assert lifecycle(adapter, "prog") == "closed"
    target = bd_id(adapter, "prog")  # one lookup: bd_id itself appends list calls to runner.calls
    closes = [c for c in adapter.runner.calls if c[:2] == ["update", target] and "closed" in c]
    assert closes and all("--force" in c for c in closes), adapter.runner.calls
    assert adapter.list_programs()[0].envelope["stage"] == prog["prog"].envelope["stage"]


def test_beads_one_extra_update_and_one_sync_per_operation(tmp_path: Path) -> None:
    support.require_bd()
    adapter = _scratch(tmp_path)
    target = bd_id(adapter, "prog")
    adapter.runner.calls.clear()

    adapter.set_epic_state("prog/E1", "in_progress")
    assert adapter.runner.count("update") == 2, adapter.runner.calls
    assert status_updates(adapter.runner, target) == [["update", target, "--status", "in_progress"]]
    assert adapter.runner.count("sync") == 1, adapter.runner.calls

    adapter.runner.calls.clear()
    adapter.set_epic_state("prog/E1", "in_progress")
    assert adapter.runner.count("update") == 1, "only the epic update, no program write"
    assert adapter.runner.count("sync") == 1, adapter.runner.calls


# --- CLI ---------------------------------------------------------------------


def test_cli_set_epic_state_returns_the_epic_record_and_program_follows(tmp_path: Path) -> None:
    corpus, _ = cli_support.copy_write_model(tmp_path)
    config, _state = cli_support.write_fake_config(tmp_path, corpus)

    result = cli_support.ok(cli_support.cli(config, tmp_path, "set-epic-state", "wm-demo/E1", "in_progress"))

    assert result["id"] == "wm-demo/E1" and result["kind"] == "epic"
    assert result["lifecycle"] == "in_progress"
    programs = cli_support.ok(cli_support.cli(config, tmp_path, "list-programs"))
    assert [p["lifecycle"] for p in programs if p["id"] == "wm-demo"] == ["in_progress"], json.dumps(programs)
