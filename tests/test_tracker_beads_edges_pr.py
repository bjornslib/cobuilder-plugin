"""Slice 26 (E7-4): the beads reads of a pull request, the two states, the ref lookup, and the gate removal.

The rows come from the real bd 1.3.0 run in transcripts/merge_pull_request_tracks_steps.json. No bd is needed.
The write argv sit in test_tracker_beads_edges.py, and the live run sits in test_tracker_beads_edges_pr_real.py.

Run with: uv run pytest tests/test_tracker_beads_edges_pr.py -q
"""
from __future__ import annotations

import copy
import re
from pathlib import Path
from typing import Any

import pytest

import _beads_mapping_support as m
import _beads_pr_support as pr
import _beads_support as support

TRACKER_PORT = support.SHARED_DIR / "tracker_port"
# A bd gate call, a gate module, or a gate helper. The word `gate` alone is a program scalar and stays legal.
GATE_CALL = re.compile(r"""\[\s*["']gate["']|gh:pr|beads_gates|create_gates|resolve_gates|gate_(?:create|resolve)_argv""")


def _open_rows() -> list[dict[str, Any]]:
    return pr.recorded_rows(pr.MERGE, 0)


def _closed_rows() -> list[dict[str, Any]]:
    return pr.recorded_rows(pr.MERGE, 2)


def _pr_row(rows: list[dict[str, Any]]) -> dict[str, Any]:
    return next(row for row in rows if row["id"] == pr.PR_BD_ID)


def test_a_read_gives_the_pull_request_its_epics_from_the_tracks_dependencies_and_no_blocker() -> None:
    records = pr.records_of(_open_rows())

    assert (records["pr-101"].kind, records["pr-101"].lifecycle) == ("pr", "open")
    assert (records["pr-101"].tracks, records["pr-101"].blocked_by) == (("demo-E1", "demo-E2"), ())
    assert [records[epic].blocked_by for epic in pr.EPICS] == [(), ()], "the epic row holds no edge to the pull request"


def test_a_read_after_the_merge_gives_a_closed_pull_request_that_keeps_its_epics() -> None:
    records = pr.records_of(_closed_rows())

    assert (records["pr-101"].lifecycle, records["pr-101"].tracks) == ("closed", ("demo-E1", "demo-E2"))
    assert [records[epic].lifecycle for epic in pr.EPICS] == ["open", "open"]


def test_a_tracks_target_that_bd_did_not_list_is_skipped_and_the_read_does_not_fail() -> None:
    rows = _open_rows()
    foreign = {"id": "t-foreign", "title": "not ours", "status": "open", "priority": 2, "issue_type": "task"}
    rows.append(foreign)
    for target in ("t-foreign", "t-hidden"):
        _pr_row(rows)["dependencies"].append(
            {"issue_id": pr.PR_BD_ID, "depends_on_id": target, "type": "tracks", "metadata": "{}"}
        )

    assert pr.records_of(rows)["pr-101"].tracks == ("demo-E1", "demo-E2"), "a foreign or hidden target is skipped"


def test_reads_survive_a_gate_row_that_bd_list_hides() -> None:
    # bd list hides gate rows, but an old epic row lists its gate as a blocks dependency.
    rows = copy.deepcopy(_open_rows())
    epic = next(row for row in rows if row["id"] == pr.EPIC_BD_ID["demo-E1"])
    epic["dependencies"] = [{"issue_id": epic["id"], "depends_on_id": "t-gate", "type": "blocks", "metadata": "{}"}]

    records = pr.records_of(rows)

    assert records["demo-E1"].blocked_by == (), "the hidden gate is no record"
    assert records["pr-101"].tracks == ("demo-E1", "demo-E2")


def test_find_record_reads_the_pull_request_by_its_external_ref_and_keeps_tracks() -> None:
    from tracker_port.beads import LIST_ARGS

    runner = m.RowsRunner(_open_rows())
    record = m.find_record(pr.adapter_over(runner), "pr-101")

    assert runner.calls[0] == m.lookup_argv("gh-101"), "the lookup runs on gh-<n>, not on pr-<n>"
    assert runner.calls == [m.lookup_argv("gh-101"), LIST_ARGS], "the full list resolves the epic ids of the edges"
    assert (record.id, record.external_ref, record.tracks) == ("pr-101", "gh-101", ("demo-E1", "demo-E2"))


def test_case_5_on_the_replay_a_merge_changes_no_ready_set_and_both_epics_are_ready() -> None:
    def ready(rows: list[dict[str, Any]]) -> dict[str, list[str]]:
        # The slice kind runs one bd ready (E7-5), so its merge case is the live test in test_tracker_beads_edges_pr_real.py.
        adapter, _ = support.list_adapter(rows)
        return {kind: sorted(r.id for r in adapter.next_ready(kind)) for kind in ("program", "epic")}

    before, after = ready(_open_rows()), ready(_closed_rows())

    assert before == after
    assert before["epic"] == ["demo-E1", "demo-E2"], "an open pull request holds neither epic"


def test_the_open_state_makes_one_update_to_open_and_no_gate_or_dep_call() -> None:
    runner = pr.QuietRunner(_closed_rows())

    record = pr.adapter_over(runner).set_pull_request_state("pr-101", merged=False)

    assert runner.calls == [["list", "--json", "--all"], ["update", pr.PR_BD_ID, "--status", "open"], ["sync"]]
    assert (record.lifecycle, record.tracks) == ("open", ("demo-E1", "demo-E2"))


def test_a_repeat_open_and_an_unknown_epic_are_refused_before_any_bd_write() -> None:
    from tracker_port.port import ArgumentError

    runner = pr.QuietRunner(_open_rows())
    adapter = pr.adapter_over(runner)
    with pytest.raises(ArgumentError, match="already exists"):
        adapter.open_pull_request("pr-101", list(pr.EPICS))
    with pytest.raises(ArgumentError):
        adapter.open_pull_request("pr-102", ["demo-E1", "demo-E9"])

    assert [call[0] for call in runner.calls] == ["list", "list"]


def test_the_gate_module_the_gate_argv_and_every_gate_call_are_gone() -> None:
    from tracker_port import bd_runner

    tests = Path(__file__).resolve().parent
    assert not (TRACKER_PORT / "beads_gates.py").exists()
    assert not [name for name in ("test_tracker_beads_gate.py", "test_tracker_beads_gate_real.py") if (tests / name).exists()]
    assert not [name for name in dir(bd_runner) if "gate" in name.lower()], "the gate argv builders are removed"
    hits = [
        f"{path.name}:{number}: {line.strip()}"
        for path in sorted(TRACKER_PORT.glob("*.py"))
        for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1)
        if GATE_CALL.search(line)
    ]
    assert hits == []
