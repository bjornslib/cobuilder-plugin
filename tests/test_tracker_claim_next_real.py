"""Slice 28 (E7-6) on real bd 1.3.0: the label filter, the epic start, the empty result, and the parallel claims.

Each test builds a scratch tracker from a small corpus (`write_corpus`): the program demo, the epic demo-E1, and
open slices demo-E1-s1 to s<n>. Every adapter below counts its bd calls and publishes nothing (`sync="off"`),
so a thread gets its own adapter over the same scratch dir. The tests carry the pytest mark `slow`, and they
skip without bd.

Run with: uv run pytest tests/test_tracker_claim_next_real.py -q -m ''
"""
from __future__ import annotations

import json
import threading
from pathlib import Path
from typing import Any

import pytest

import _beads_support as support
import _claim_next_support as c
import _tracker_contract_support as contract
from _beads_mapping_support import need

pytestmark = pytest.mark.slow


def _scratch(tmp_path: Path, slices: int) -> Path:
    """Build the scratch tracker. Return the dir that bd runs in."""
    return Path(contract._build_beads_scratch(c.write_corpus(tmp_path, slices)).runner.cwd)


def _bd(root: Path) -> Any:
    from tracker_port.bd_runner import BdRunner

    return BdRunner(cwd=root)


def _adapter(root: Path) -> Any:
    from tracker_port.beads import BeadsAdapter

    return BeadsAdapter(support.CountingRunner(_bd(root)), sync="off")


def _rows(root: Path) -> dict[str, dict[str, Any]]:
    """The bd rows by cb id, or by title for a foreign row."""
    listed = json.loads(_bd(root).run(["list", "--json", "--all"]))
    return {(row.get("metadata") or {}).get("cb", {}).get("id", row["title"]): row for row in listed}


def _parallel(root: Path, claimants: list[str]) -> tuple[dict[str, Any], list[Any]]:
    """Run claim_next once for each claimant at the same moment. Return the outcome by claimant and the adapters."""
    adapters = [_adapter(root) for _ in claimants]
    barrier = threading.Barrier(len(claimants))
    outcomes: dict[str, Any] = {}

    def claim(adapter: Any, claimant: str) -> None:
        barrier.wait()
        try:
            outcomes[claimant] = need(adapter, "claim_next")(claimant)
        except Exception as error:  # noqa: BLE001 - the test reports it by value
            outcomes[claimant] = error

    threads = [threading.Thread(target=claim, args=pair) for pair in zip(adapters, claimants)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    return outcomes, adapters


def test_the_claim_takes_the_cb_slice_and_never_the_foreign_task_of_priority_0(tmp_path: Path) -> None:
    root = _scratch(tmp_path, slices=2)
    raw = _bd(root)
    raw.run(["create", "foreign", "--type", "task", "--priority", "0", "--silent"])
    unfiltered = json.loads(raw.run(["ready", "-t", "task", "--json", "--limit", "0"]))
    assert unfiltered[0]["title"] == "foreign", "bd would claim the foreign task first: the fixture is meaningful"
    adapter = _adapter(root)

    record = need(adapter, "claim_next")("alice")

    rows = _rows(root)
    assert (record.kind, record.lifecycle, record.assignee) == ("slice", "in_progress", "alice")
    assert record.id in ("demo-E1-s1", "demo-E1-s2")
    assert (rows[record.id]["status"], rows[record.id]["assignee"]) == ("in_progress", "alice")
    assert (rows["foreign"]["status"], rows["foreign"].get("assignee")) == ("open", None)
    assert adapter.runner.calls[1] == c.claim_argv("alice")
    assert adapter.runner.count("ready") == 1


def test_the_epic_reads_in_progress_after_one_update_and_a_second_claim_under_it_makes_none(tmp_path: Path) -> None:
    root = _scratch(tmp_path, slices=2)
    first, second = _adapter(root), _adapter(root)
    epic_bd_id = _rows(root)["demo-E1"]["id"]

    one = need(first, "claim_next")("alice", under="demo-E1")
    started = [epic for epic in first.list_epics() if epic.id == "demo-E1"][0]
    two = need(second, "claim_next")("bob", under="demo-E1")

    assert started.lifecycle == "in_progress"
    assert [call for call in first.runner.calls if call[0] == "update"] == [["update", epic_bd_id, "--status", "in_progress"]]
    assert second.runner.count("update") == 0, "the epic is already in progress, so the second claim writes none"
    assert {one.id, two.id} == {"demo-E1-s1", "demo-E1-s2"}
    assert _rows(root)["demo-E1"]["status"] == "in_progress"


def test_a_held_slice_is_skipped_and_nothing_ready_gives_none_with_no_write(tmp_path: Path) -> None:
    root = _scratch(tmp_path, slices=2)
    holder, adapter = _adapter(root), _adapter(root)
    holder.claim_slice("demo-E1-s1", "alice")

    got = need(adapter, "claim_next")("bob")
    none = need(_adapter(root), "claim_next")("bob")
    empty = _adapter(root)
    nothing = need(empty, "claim_next")("bob", under="demo-E1")

    assert (got.id, got.assignee) == ("demo-E1-s2", "bob")
    assert (none, nothing) == (None, None)
    assert empty.runner.count("update") == 0
    assert [call[0] for call in empty.runner.calls] == ["list", "ready"]
    assert _rows(root)["demo-E1-s1"]["assignee"] == "alice"


def test_eight_parallel_calls_on_eight_ready_slices_give_eight_different_slices(tmp_path: Path) -> None:
    root = _scratch(tmp_path, slices=8)
    claimants = [f"worker-{n}" for n in range(8)]

    outcomes, _ = _parallel(root, claimants)

    errors = {name: out for name, out in outcomes.items() if isinstance(out, Exception)}
    assert errors == {} and len(outcomes) == 8
    assert {record.id for record in outcomes.values()} == {f"demo-E1-s{n}" for n in range(1, 9)}
    assert {name: record.assignee for name, record in outcomes.items()} == {name: name for name in claimants}
    rows = _rows(root)
    assert {rows[f"demo-E1-s{n}"]["assignee"] for n in range(1, 9)} == set(claimants)
    assert rows["demo-E1"]["status"] == "in_progress"


def test_eight_claimants_on_one_ready_slice_give_one_winner_and_seven_none(tmp_path: Path) -> None:
    root = _scratch(tmp_path, slices=1)
    claimants = [f"worker-{n}" for n in range(8)]

    outcomes, adapters = _parallel(root, claimants)

    errors = {name: out for name, out in outcomes.items() if isinstance(out, Exception)}
    winners = [name for name, out in outcomes.items() if out is not None]
    assert errors == {} and len(outcomes) == 8
    assert len(winners) == 1
    assert outcomes[winners[0]].id == "demo-E1-s1"
    assert sum(out is None for out in outcomes.values()) == 7
    assert _rows(root)["demo-E1-s1"]["assignee"] == winners[0]
    assert [adapter.runner.count("update") for adapter, name in zip(adapters, claimants) if name != winners[0]] == [0] * 7
