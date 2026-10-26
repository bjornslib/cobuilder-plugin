"""E5-2 on real bd: eight concurrent claims give one winner, and a held claim stays held.

Run with: uv run pytest tests/test_tracker_beads_claim_real.py -q
"""
from __future__ import annotations

import json
import threading
from pathlib import Path
from typing import Any

import pytest

import _beads_support as support

pytestmark = pytest.mark.slow


def _scratch_slice(root: Path) -> Any:
    support.require_bd()
    from tracker_port.bd_runner import BdRunner

    runner = BdRunner(cwd=root)
    runner.run(["init", "--quiet", "--prefix", "t", "--skip-agents", "--skip-hooks", "--non-interactive"])
    block = {"cb": {"v": 1, "id": "demo-E1-s3", "kind": "slice", "envelope": {}}}
    runner.run(["create", "--silent", "--type", "task", "--title", "demo-E1-s3", "--metadata", json.dumps(block)])
    return runner


def _adapter(root: Path) -> Any:
    from tracker_port.bd_runner import BdRunner
    from tracker_port.beads import BeadsAdapter

    return BeadsAdapter(support.CountingRunner(BdRunner(cwd=root)), sync="off")


def _assert_one_claim_write(adapter: Any, claimant: str) -> None:
    # One claim update with the claim flag, and no read-back after it.
    updates = [call for call in adapter.runner.calls if call[0] == "update"]
    assert len(updates) == 1, adapter.runner.calls
    assert updates[0][2:] == ["--claim", "--actor", claimant]
    assert adapter.runner.count("show") == 0


def test_eight_concurrent_claims_give_one_winner(tmp_path: Path) -> None:
    from tracker_port.port import AdapterError

    _scratch_slice(tmp_path)
    claimants = [f"worker-{n}" for n in range(8)]
    adapters = [_adapter(tmp_path) for _ in claimants]
    barrier = threading.Barrier(len(claimants))
    outcomes: dict[str, Any] = {}

    def claim(adapter: Any, claimant: str) -> None:
        barrier.wait()
        try:
            outcomes[claimant] = adapter.claim_slice("demo-E1-s3", claimant)
        except AdapterError as error:
            outcomes[claimant] = error

    threads = [threading.Thread(target=claim, args=pair) for pair in zip(adapters, claimants)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    winners = [name for name, outcome in outcomes.items() if not isinstance(outcome, Exception)]
    assert len(outcomes) == 8
    assert len(winners) == 1
    assert sum(isinstance(outcome, AdapterError) for outcome in outcomes.values()) == 7
    for adapter, claimant in zip(adapters, claimants):
        _assert_one_claim_write(adapter, claimant)
    assert _adapter(tmp_path).get_slice("demo-E1-s3").assignee == winners[0]


def test_a_held_claim_refuses_a_second_claimant(tmp_path: Path) -> None:
    # A lease that ran out does not free a claim (spike, claim-lease-expiry.json), so the held case covers it.
    from tracker_port.port import AdapterError

    _scratch_slice(tmp_path)
    adapter = _adapter(tmp_path)
    adapter.claim_slice("demo-E1-s3", "alice")

    second = _adapter(tmp_path)
    with pytest.raises(AdapterError, match="alice"):
        second.claim_slice("demo-E1-s3", "bob")
    _assert_one_claim_write(adapter, "alice")
    _assert_one_claim_write(second, "bob")

    held = adapter.get_slice("demo-E1-s3")
    assert held.assignee == "alice"
    assert held.lifecycle == "in_progress"
