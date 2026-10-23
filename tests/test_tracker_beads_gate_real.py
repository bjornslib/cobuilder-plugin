"""E5-4 on real bd: a pull request with two blocked epics, a merge, both gates resolved.

Run with: uv run pytest tests/test_tracker_beads_gate_real.py -q
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

import _beads_support as support

pytestmark = pytest.mark.slow


def _scratch_epics(root: Path) -> Any:
    support.require_bd()
    from tracker_port.bd_runner import BdRunner
    from tracker_port.beads_rows import _create_argv

    runner = BdRunner(cwd=root)
    runner.run(["init", "--quiet", "--prefix", "t", "--skip-agents", "--skip-hooks", "--non-interactive"])
    for epic in ("demo-E1", "demo-E2"):
        runner.run(_create_argv({"v": 1, "id": epic, "kind": "epic", "envelope": {}}))
    return runner


def _pending_gates(runner: Any) -> list[dict[str, Any]]:
    # bd prints null, not an empty list, when no gate is open.
    return json.loads(runner.run(["gate", "list", "--json"])) or []


def test_merge_resolves_both_gates_and_frees_both_epics(tmp_path: Path) -> None:
    from tracker_port.beads import BeadsAdapter

    runner = _scratch_epics(tmp_path)
    adapter = BeadsAdapter(support.CountingRunner(runner), sync="off")

    adapter.open_pull_request("pr-101", ["demo-E1", "demo-E2"])
    pending = _pending_gates(runner)
    assert len(pending) == 2
    assert {gate["await_type"] for gate in pending} == {"gh:pr"}
    assert {gate["await_id"] for gate in pending} == {"101"}
    assert [epic.id for epic in adapter.next_ready("epic")] == []

    adapter.set_pull_request_state("pr-101", merged=True)

    assert _pending_gates(runner) == []
    assert [epic.id for epic in adapter.next_ready("epic")] == ["demo-E1", "demo-E2"]
    resolves = [call for call in adapter.runner.calls if call[:2] == ["gate", "resolve"]]
    assert len(resolves) == 2


def test_an_open_state_leaves_both_gates_pending(tmp_path: Path) -> None:
    from tracker_port.beads import BeadsAdapter

    runner = _scratch_epics(tmp_path)
    adapter = BeadsAdapter(runner, sync="off")
    adapter.open_pull_request("pr-101", ["demo-E1", "demo-E2"])

    adapter.set_pull_request_state("pr-101", merged=False)

    assert len(_pending_gates(runner)) == 2
    assert adapter.next_ready("epic") == []
