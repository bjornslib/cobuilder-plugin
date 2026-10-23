"""E5-5 on real bd 1.3.0: cook, pour, ready order, attempt wisps, and squash.

Facts pinned here, from scratch runs on bd 1.3.0:
- bd reads a formula by the file name <name>.formula.toml, so the test copies the file.
- `bd cook --persist` makes a proto. `bd mol pour` makes a molecule root with three steps.
- `bd ready --mol` lists the molecule root too. The helper drops it.
- Closing the last step closes the molecule ("all steps complete").
- An attempt is `bd create --ephemeral --parent <mol>`. It gets the id <mol>.1.
- `bd mol squash` deletes the open wisp children. `--keep-children` keeps them.

Run with: uv run pytest tests/test_tracker_beads_formula_real.py -q
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

import _formula_support as fs

pytestmark = pytest.mark.slow


def _show(runner: Any, issue: str) -> dict[str, Any]:
    return json.loads(runner.run(["show", issue, "--json"]))[0]


def _attempt(runner: Any, mol: str, title: str) -> str:
    out = json.loads(runner.run(["create", title, "--ephemeral", "--parent", mol, "--json"]))
    assert out["ephemeral"] is True
    return out["id"]


def test_formula_cooks_to_a_proto(tmp_path: Path) -> None:
    runner = fs.scratch_workspace(tmp_path)
    cooked = json.loads(runner.run(["cook", "slice-loop", "--var", "slice_id=S1"]))
    assert [step["id"] for step in cooked["steps"]] == fs.STEP_IDS
    assert cooked["steps"][0]["title"] == "RED S1"
    out = runner.run(["cook", "slice-loop", "--persist", "--force"])
    assert "Cooked proto: slice-loop" in out
    assert "Created 4 issues" in out


def test_pour_makes_a_molecule_that_runs_red_green_validate(tmp_path: Path) -> None:
    runner = fs.scratch_workspace(tmp_path)
    ids = fs.pour(runner, "S1")
    assert len({ids["mol"], ids["red"], ids["green"], ids["validate"]}) == 4
    assert _show(runner, ids["mol"])["issue_type"] == "molecule"
    assert fs.ready_ids(runner, ids["mol"]) == [ids["red"]]
    runner.run(["close", ids["red"]])
    assert fs.ready_ids(runner, ids["mol"]) == [ids["green"]]
    runner.run(["close", ids["green"]])
    assert fs.ready_ids(runner, ids["mol"]) == [ids["validate"]]
    assert _show(runner, ids["mol"])["status"] == "open"
    runner.run(["close", ids["validate"]])
    root = _show(runner, ids["mol"])
    assert root["status"] == "closed"
    assert root["close_reason"] == "all steps complete"


def test_failed_attempt_is_an_ephemeral_child_of_the_slice(tmp_path: Path) -> None:
    runner = fs.scratch_workspace(tmp_path)
    mol = fs.pour(runner, "S1")["mol"]
    first = _attempt(runner, mol, "attempt 1 failed")
    second = _attempt(runner, mol, "attempt 2 failed")
    assert (first, second) == (f"{mol}.1", f"{mol}.2")
    assert set(fs.wisp_ids(runner)) == {first, second}


def test_squash_keep_children_keeps_the_attempt_wisps(tmp_path: Path) -> None:
    runner = fs.scratch_workspace(tmp_path)
    mol = fs.pour(runner, "S1")["mol"]
    wisp = _attempt(runner, mol, "attempt 1 failed")
    out = json.loads(runner.run(["mol", "squash", mol, "--keep-children", "--summary", "s", "--json"]))
    assert out["kept_children"] is True
    assert out["deleted_count"] == 0
    assert out["squashed_ids"] == [wisp]
    assert _show(runner, out["digest_id"])["title"] == "Digest: slice-loop"
    assert wisp in fs.wisp_ids(runner)
    assert _show(runner, wisp)["status"] == "open"


def test_squash_without_the_flag_deletes_open_wisp_children(tmp_path: Path) -> None:
    from tracker_port.bd_runner import BdError

    runner = fs.scratch_workspace(tmp_path)
    mol = fs.pour(runner, "S1")["mol"]
    wisp = _attempt(runner, mol, "attempt 1 failed")
    out = json.loads(runner.run(["mol", "squash", mol, "--summary", "s", "--json"]))
    assert out["kept_children"] is False
    assert out["deleted_count"] == 1
    assert out["digest_id"]
    assert wisp not in fs.wisp_ids(runner)
    with pytest.raises(BdError):
        runner.run(["show", wisp, "--json"])
