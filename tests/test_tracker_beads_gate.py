"""E5-4: the beads adapter mirrors the pull request blocker with one gh:pr gate for each blocked epic.

Replays real bd 1.3.0 runs, recorded in tests/fixtures/tracker/beads/transcripts/
(open_pull_request_gate_steps, merge_pull_request_gate_steps,
merge_pull_request_gate_without_number_steps). The call patterns are pinned:

open_pull_request: list, create PR, dep add per epic (the blocker stays), gate create per
epic (await-id is the PR number), update PR metadata (envelope.gates holds the gate ids), sync.
set_pull_request_state merged: list, gate list, gate resolve for each stored gate with a number,
update PR to closed, sync. A closed or open state calls no gate command.
A record with no stored gate ids calls no gate command at all.

Run with: uv run pytest tests/test_tracker_beads_gate.py -q
"""
from __future__ import annotations

import json
from typing import Any

import _beads_support as support

OPEN = "open_pull_request_gate_steps"
MERGE = "merge_pull_request_gate_steps"
NUMBERLESS = "merge_pull_request_gate_without_number_steps"
GATES = ["t-420", "t-9nh"]


def _adapter(runner: Any, sync: str = "write") -> Any:
    from tracker_port.beads import BeadsAdapter

    return BeadsAdapter(runner, sync=sync)


def _replay(name: str) -> Any:
    return support.SequenceRunner(support.with_syncs(support.steps(name)))


def _verbs(runner: Any) -> list[str]:
    return [" ".join(call[:2]) if call[0] == "gate" else call[0] for call in runner.calls]


def test_gate_argv_builders() -> None:
    from tracker_port import bd_runner

    assert hasattr(bd_runner, "gate_resolve_argv") and hasattr(bd_runner, "gate_create_argv")
    gate_create_argv, gate_resolve_argv = bd_runner.gate_create_argv, bd_runner.gate_resolve_argv
    assert gate_resolve_argv("t-420") == ["gate", "resolve", "t-420"]
    assert gate_create_argv("t-hak", "101") == [
        "gate", "create", "--type", "gh:pr", "--blocks", "t-hak", "--await-id", "101", "--json",
    ]


def test_open_pull_request_adds_one_gate_for_each_epic_and_keeps_the_blocker() -> None:
    runner = _replay(OPEN)
    _adapter(runner).open_pull_request("pr-101", ["demo-E1", "demo-E2"])

    assert _verbs(runner) == [
        "list", "create", "dep", "dep", "gate create", "gate create", "update", "sync",
    ]
    assert len(runner.calls) == len(runner.steps)
    for gate_call in runner.calls[4:6]:
        assert gate_call[gate_call.index("--await-id") + 1] == "101"
        assert gate_call[gate_call.index("--type") + 1] == "gh:pr"


def test_open_pull_request_stores_the_gate_ids_in_the_pr_metadata() -> None:
    runner = _replay(OPEN)
    _adapter(runner).open_pull_request("pr-101", ["demo-E1", "demo-E2"])

    written = support.metadata_arg(runner.calls[6])["cb"]
    assert written == {"v": 1, "id": "pr-101", "kind": "pr", "envelope": {"gates": GATES}}


def test_gate_replay_rejects_a_drifted_await_id() -> None:
    steps = support.steps(OPEN)
    runner = support.SequenceRunner(steps)
    for step in steps[:4]:
        runner.run(list(step["args"]))
    drifted = list(steps[4]["args"])
    drifted[drifted.index("--await-id") + 1] = "102"
    try:
        runner.run(drifted)
    except AssertionError:
        return
    raise AssertionError("a gate create with a changed await-id must fail the replay")


def test_merge_resolves_each_gate_before_it_closes_the_pr() -> None:
    runner = _replay(MERGE)
    record = _adapter(runner).set_pull_request_state("pr-101", merged=True)

    assert _verbs(runner) == ["list", "gate list", "gate resolve", "gate resolve", "update", "sync"]
    assert [call[2] for call in runner.calls[2:4]] == GATES
    assert runner.calls[4][2:] == ["--status", "closed"]
    assert record.lifecycle == "closed"


def test_a_gate_with_no_stored_number_stays_pending() -> None:
    # The second gate has no await-id. Merge resolves the first gate only and raises no error.
    runner = _replay(NUMBERLESS)
    record = _adapter(runner).set_pull_request_state("pr-101", merged=True)

    resolved = [call[2] for call in runner.calls if call[:2] == ["gate", "resolve"]]
    assert len(resolved) == 1
    assert resolved[0] in support.steps(NUMBERLESS)[2]["args"]
    assert _verbs(runner) == ["list", "gate list", "gate resolve", "update", "sync"]
    assert record.lifecycle == "closed"


class _ListThenQuiet:
    """Answers the list read with fixed rows and every other call with empty output."""

    def __init__(self, rows: list[dict[str, Any]]) -> None:
        self.rows = rows
        self.calls: list[list[str]] = []

    def run(self, args: list[str]) -> str:
        self.calls.append(list(args))
        return json.dumps(self.rows) if args[0] == "list" else ""


def _rows_after_open() -> list[dict[str, Any]]:
    return json.loads(support.steps(MERGE)[0]["stdout"])


def test_an_open_state_resolves_no_gate() -> None:
    runner = _ListThenQuiet(_rows_after_open())
    _adapter(runner, sync="off").set_pull_request_state("pr-101", merged=False)

    assert all(call[0] != "gate" for call in runner.calls), runner.calls
    assert runner.calls[1] == ["update", "t-2k6", "--status", "open"]


def test_a_pr_with_no_stored_gates_calls_no_gate_command() -> None:
    rows = _rows_after_open()
    for row in rows:
        if row["title"] == "pr-101":
            row["metadata"]["cb"]["envelope"] = {}
    runner = _ListThenQuiet(rows)
    record = _adapter(runner, sync="off").set_pull_request_state("pr-101", merged=True)

    assert [call[0] for call in runner.calls] == ["list", "update"]
    assert record.lifecycle == "closed"


def test_reads_survive_open_gates_that_bd_list_hides() -> None:
    # bd list hides gate rows, but each epic row lists its gate as a blocks dependency.
    adapter, _ = support.list_adapter(_rows_after_open())

    epics = adapter.list_epics()
    assert [epic.id for epic in epics] == ["demo-E1", "demo-E2"]
    assert all(epic.blocked_by == ("pr-101",) for epic in epics)
    assert adapter.next_ready("epic") == []
    pull_request = adapter.list_pull_requests()[0]
    assert tuple(pull_request.envelope["gates"]) == tuple(GATES)
