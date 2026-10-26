"""repair-status on a beads adapter over a replay runner: a dry run, a live run, a rerun, and a resume.

Rules: a dry run runs only `list`. A live run closes each stale row with `close <bd id> --force` and
syncs once, as the last call. A second run makes no write and no sync. A run that stops in the middle
resumes, and no row closes twice. A design at `approved` never closes. The tracker stage wins over goal.json.

Run with: uv run pytest tests/test_tracker_repair_status_replay.py -q
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

import _beads_support as support

BD_TYPE = {"program": "feature", "epic": "epic", "slice": "task"}
WRITE_VERBS = {"close", "update", "sync"}
STALE = {("d/E1", "close"), ("d/E2", "close"), ("d/E1/1", "close")}


def _bd(cb_id: str) -> str:
    return "t-" + cb_id.replace("/", "-").lower()


def _row(cb_id: str, kind: str, parent: str | None = None, envelope: dict[str, Any] | None = None) -> dict[str, Any]:
    return {
        "id": _bd(cb_id), "status": "open", "issue_type": BD_TYPE[kind],
        "parent": _bd(parent) if parent else None,
        "metadata": {"cb": {"v": 1, "id": cb_id, "kind": kind, "envelope": envelope or {}}},
    }


def _corpus(stage: str | None) -> list[dict[str, Any]]:
    """A program d at `stage`, two open epics under it, and one open slice under d/E1."""
    return [
        _row("d", "program", envelope={"stage": stage} if stage else {}),
        _row("d/E1", "epic", "d", {"state": "backlog"}),
        _row("d/E2", "epic", "d", {"state": "backlog"}),
        _row("d/E1/1", "slice", "d/E1"),
    ]


class ReplayRunner:
    """Plays bd over rows in memory and records each call. It stops at the Nth `close` when `fail_on_close` is N."""

    def __init__(self, rows: list[dict[str, Any]], fail_on_close: int | None = None) -> None:
        self.rows = rows
        self.fail_on_close = fail_on_close
        self.calls: list[list[str]] = []

    def run(self, args: list[str]) -> str:
        self.calls.append(list(args))
        if args == ["list", "--json", "--all"]:
            return json.dumps(self.rows)
        if args[0] == "close":
            self._close(args)
        return ""

    def _close(self, args: list[str]) -> None:
        from tracker_port.bd_runner import BdError

        assert len(args) == 3 and args[2] == "--force", f"unexpected close call {args}"
        row = next((r for r in self.rows if r["id"] == args[1]), None)
        assert row is not None, f"close of unknown bd id {args[1]}"
        if self.fail_on_close == len(self.closes()):
            raise BdError(f"bd close {args[1]} failed", exit_code=1, stderr="stopped")
        row["status"] = "closed"

    def closes(self) -> list[str]:
        """The bd id of each `close` call, in call order."""
        return [call[1] for call in self.calls if call[0] == "close"]

    def verbs(self) -> list[str]:
        return [call[0] for call in self.calls]

    def status(self) -> dict[str, str]:
        return {row["id"]: row["status"] for row in self.rows}


def _adapter(runner: ReplayRunner) -> Any:
    from tracker_port.beads import BeadsAdapter

    return BeadsAdapter(runner, sync="write")


def _pairs(plan: dict[str, Any]) -> set[tuple[str, str]]:
    return {(entry["id"], entry["action"]) for entry in plan["changes"]}


def test_dry_run_makes_no_write_and_no_sync() -> None:
    runner = ReplayRunner(_corpus("implemented"))

    plan = _adapter(runner).repair_status(dry_run=True)

    assert len(plan["changes"]) == 3 and _pairs(plan) == STALE
    assert runner.calls and set(runner.verbs()) <= support.READ_VERBS, runner.calls
    assert not WRITE_VERBS & set(runner.verbs())
    assert set(runner.status().values()) == {"open"}


def test_live_run_closes_with_force_and_one_sync() -> None:
    runner = ReplayRunner(_corpus("implemented"))

    plan = _adapter(runner).repair_status()

    assert len(plan["changes"]) == 3 and _pairs(plan) == STALE
    assert sorted(runner.closes()) == sorted(_bd(cb_id) for cb_id, _ in STALE)
    assert all(call[-1] == "--force" for call in runner.calls if call[0] == "close")
    assert runner.verbs().count("sync") == 1 and runner.calls[-1] == ["sync"]
    assert "update" not in runner.verbs()


def test_second_run_changes_nothing() -> None:
    runner = ReplayRunner(_corpus("implemented"))
    adapter = _adapter(runner)
    adapter.repair_status()
    runner.calls.clear()

    again = adapter.repair_status()

    assert again["changes"] == []
    assert not WRITE_VERBS & set(runner.verbs()), runner.calls


def test_interrupted_run_resumes() -> None:
    from tracker_port.port import AdapterError

    first = ReplayRunner(_corpus("implemented"), fail_on_close=2)
    with pytest.raises(AdapterError):  # BdError is an AdapterError
        _adapter(first).repair_status()
    first_closed = first.closes()[0]
    assert first.status()[first_closed] == "closed" and list(first.status().values()).count("closed") == 1

    rerun = ReplayRunner(first.rows)  # a fresh adapter and runner on the state that the first run left
    plan = _adapter(rerun).repair_status()

    left = {_bd("d/E2"), _bd("d/E1/1")}
    assert {entry["id"] for entry in plan["changes"]} == {"d/E2", "d/E1/1"}
    assert len(rerun.closes()) == len(set(rerun.closes())), "a row closed twice"
    assert first_closed not in rerun.closes() and set(rerun.closes()) == left
    assert rerun.verbs().count("sync") == 1 and rerun.calls[-1] == ["sync"]
    assert {rerun.status()[bd_id] for bd_id in left | {first_closed}} == {"closed"}


def test_a_design_at_approved_never_closes(tmp_path: Path) -> None:
    rows = [_row("a", "program", envelope={"stage": "approved"}), _row("a/E1", "epic", "a", {"state": "backlog"})]
    index = tmp_path / "index.json"
    index.write_text(json.dumps({"joins": {"epic_status": {"a/E1": "merged"}}}), encoding="utf-8")
    runner = ReplayRunner(rows)

    plan = _adapter(runner).repair_status(index=index)

    assert [(hold["id"], hold["rule"]) for hold in plan["holds"]] == [("a/E1", "live-stage-with-merged-pr")]
    assert plan["changes"] == []
    assert runner.closes() == [] and not WRITE_VERBS & set(runner.verbs())
    assert runner.status()[_bd("a/E1")] == "open"


def test_the_stage_from_the_tracker_wins_over_goal_json(tmp_path: Path) -> None:
    plans = tmp_path / "plans"
    plans.mkdir()
    goal = tmp_path / "architecture" / "designs" / "d" / "goal.json"
    goal.parent.mkdir(parents=True)
    goal.write_text(json.dumps({"stage": "implemented"}), encoding="utf-8")
    runner = ReplayRunner(_corpus("approved"))

    plan = _adapter(runner).repair_status(plans_dir=plans)

    assert plan["changes"] == []
    assert runner.closes() == [] and not WRITE_VERBS & set(runner.verbs())
    # The control: with no tracker stage, the same goal.json closes the three rows.
    stageless = _adapter(ReplayRunner(_corpus(None))).repair_status(dry_run=True, plans_dir=plans)
    assert STALE <= _pairs(stageless)
