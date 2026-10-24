"""Slice 26 (E7-4) on real bd 1.3.0: a pull request for two epics hides no slice, and a merge only closes it.

The test builds a program with two unchained epics in a scratch tracker. It needs `bd` on PATH.
Run with: uv run pytest tests/test_tracker_beads_edges_pr_real.py -q -m ''
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

import _beads_mapping_support as m
import _beads_support as support
import _inprogress_support as ip

pytestmark = pytest.mark.slow

EPICS = ["prdemo/E1", "prdemo/E2"]


def _adapter(root: Path) -> Any:
    support.require_bd()
    adapter = ip.beads_adapter(root, runner_wrap=support.CountingRunner)
    adapter.create_record(m.make_record(id="prdemo", kind="program", external_ref="prdemo", envelope={"stage": "design"}))
    for epic in EPICS:
        adapter.create_record(m.make_record(id=epic, kind="epic", parent="prdemo", external_ref=epic))
    for slice_id, epic in (("prdemo/1", "prdemo/E1"), ("prdemo/2", "prdemo/E2")):
        adapter.create_record(m.make_record(id=slice_id, kind="slice", parent=epic, external_ref=slice_id))
    adapter.create_record(m.make_record(id="prdemo/3", kind="slice", parent="prdemo/E1", blocked_by=("prdemo/1",), external_ref="prdemo/3"))
    return adapter


def _rows(adapter: Any) -> dict[str, dict[str, Any]]:
    rows = json.loads(adapter.runner.inner.run(["list", "--json", "--all", "--limit", "0"]))
    return {row["metadata"]["cb"]["id"]: row for row in rows if "cb" in (row.get("metadata") or {})}


def _ready(adapter: Any, kind: str) -> set[str]:
    listed = json.loads(adapter.runner.inner.run(["ready", "-t", kind, "--label", "cb", "--json", "--limit", "0"]))
    return {row["external_ref"] for row in listed}


def test_a_pull_request_for_two_epics_hides_no_slice_and_a_merge_only_closes_the_milestone(tmp_path: Path) -> None:
    adapter = _adapter(tmp_path)
    first_slices = {"prdemo/1", "prdemo/2"}
    assert _ready(adapter, "task") == first_slices

    adapter.open_pull_request("pr-101", list(EPICS))

    rows = _rows(adapter)
    pull_request, bd_id = rows["pr-101"], {cb_id: row["id"] for cb_id, row in rows.items()}
    assert (pull_request["issue_type"], pull_request["external_ref"], pull_request["labels"]) == ("milestone", "gh-101", ["cb"])
    assert sorted((d["depends_on_id"], d["type"]) for d in pull_request.get("dependencies") or []) == sorted(
        (bd_id[epic], "tracks") for epic in EPICS
    )
    assert not [d for row in rows.values() for d in row.get("dependencies") or [] if d["depends_on_id"] == bd_id["pr-101"]]
    assert (json.loads(adapter.runner.inner.run(["gate", "list", "--json"]) or "null") or []) == []
    assert _ready(adapter, "task") == first_slices, "both slice frontiers stay in bd ready, and the milestone is no task"
    assert "pr-101" not in _ready(adapter, "task")
    assert {r.id for r in adapter.next_ready("slice")} == first_slices
    assert {r.id for r in adapter.next_ready("epic")} == set(EPICS)
    assert sorted(next(r for r in adapter.list_pull_requests()).tracks) == EPICS

    others, calls = {k: v for k, v in rows.items() if k != "pr-101"}, len(adapter.runner.calls)
    adapter.set_pull_request_state("pr-101", merged=True)

    after = _rows(adapter)
    assert [call[0] for call in adapter.runner.calls[calls:]] == ["list", "update", "sync"]
    assert after["pr-101"]["status"] == "closed" and after["pr-101"].get("dependencies") == pull_request.get("dependencies")
    assert {k: v for k, v in after.items() if k != "pr-101"} == others, "a merge changes no other row"
    assert _ready(adapter, "task") == first_slices
    assert {r.id for r in adapter.next_ready("epic")} == set(EPICS)
