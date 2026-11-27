"""Slice 29 (E7-7): an interrupted `migrate_mapping` resumes, and a rerun repeats no step that already holds.

BdSim raises on the write after the first K (K writes took effect). The run raises `AdapterError` and makes no
sync. A new run reads the rows again and acts only on the rows that still differ. BdSim also refuses a repeated
dependency and a repeated gate resolve, so a step that repeats itself fails. The data rule: a pull request keeps
no copy of the epics that it tracked once its blocks edge is gone, so the tracks edge must go in before the blocks
edge goes out, and a stop between the two loses no link.

Run with: uv run pytest tests/test_tracker_migrate_mapping_resume.py -q
"""
from __future__ import annotations

from typing import Any

import pytest

import _migrate_support as s
from _migrate_sim import BdSim, syncs, writes

UNBLOCK_STEP = ("unblock", "track", "gate")


def _migrate(sim: BdSim, dry_run: bool = False) -> dict[str, Any]:
    return s.migrate(s.adapter_over(sim), dry_run=dry_run, plans_dir=s.PLANS)


def _interrupt(sim: BdSim) -> list[list[str]]:
    from tracker_port.port import AdapterError

    with pytest.raises(AdapterError):
        _migrate(sim)
    done = list(sim.applied)
    assert syncs(sim.calls) == 0, "a run that stops publishes nothing"
    sim.fail_after = None
    sim.reset_log()
    return done


def _uninterrupted() -> tuple[list[list[str]], str]:
    sim = s.legacy_sim()
    _migrate(sim)
    return sim.applied, sim.state()


def _is_unblock_write(call: list[str]) -> bool:
    # The edges, the gates, and the write that drops the gate ids from the envelope of the pull request.
    pr_envelope = call[0] == "update" and call[1] == s.BD["pr-101"] and "--metadata" in call
    return call[:2] in (["dep", "rm"], ["gate", "resolve"]) or (call[:2] == ["dep", "add"] and "tracks" in call) or pr_envelope


def test_a_run_that_stops_after_the_unblock_step_resumes_and_finishes_the_other_steps() -> None:
    applied, final = _uninterrupted()
    stop = max(i for i, call in enumerate(applied) if _is_unblock_write(call)) + 1
    sim = s.legacy_sim(fail_after=stop)
    done = _interrupt(sim)

    report = _migrate(sim)

    assert not any(s.pairs(report)[(cb_id, change)] for cb_id in ("mapped/E1", "mapped/E2", "pr-101") for change in UNBLOCK_STEP)
    assert not [call for call in sim.applied if call in done], "the rerun repeats no write that took effect"
    assert sim.state() == final
    assert sim.calls[-1] == ["sync"] and syncs(sim.calls) == 1


def test_a_stop_at_each_single_write_resumes_to_the_same_tracker_with_one_sync_and_no_repeat() -> None:
    applied, final = _uninterrupted()

    for stop in range(1, len(applied)):
        sim = s.legacy_sim(fail_after=stop)
        done = _interrupt(sim)
        assert len(done) == stop

        report = _migrate(sim)

        assert [call for call in sim.applied if call in done] == [], f"a write repeats after a stop at write {stop}"
        assert sim.state() == final, f"the tracker differs after a stop at write {stop}"
        assert syncs(sim.calls) == 1 and sim.calls[-1] == ["sync"], stop
        assert 0 < report["changed"] < sum(s.FULL.values()), stop
        sim.reset_log()
        assert _migrate(sim)["changed"] == 0 and writes(sim.calls) == [] and syncs(sim.calls) == 0, stop


def test_a_dry_run_after_a_stop_lists_only_what_is_left_and_writes_nothing() -> None:
    sim = s.legacy_sim(fail_after=5)
    _interrupt(sim)
    left = sim.state()

    report = _migrate(sim, dry_run=True)

    assert 0 < report["changed"] < sum(s.FULL.values())
    assert writes(sim.calls) == [] and syncs(sim.calls) == 0 and sim.state() == left
    assert s.pairs(report) <= s.FULL


def test_a_stop_between_the_tracks_edge_and_the_blocks_edge_keeps_the_link_of_the_pull_request() -> None:
    applied, _ = _uninterrupted()
    first_rm = next(i for i, call in enumerate(applied) if call[:2] == ["dep", "rm"] and call[3] == s.BD["pr-101"])
    sim = s.legacy_sim(fail_after=first_rm)
    _interrupt(sim)
    pr = next(row for row in sim.rows if row["id"] == s.BD["pr-101"])

    assert {dep["depends_on_id"] for dep in pr["dependencies"] if dep["type"] == "tracks"}, "the first epic is tracked before its edge goes"

    _migrate(sim)
    pr = next(row for row in sim.rows if row["id"] == s.BD["pr-101"])

    assert {dep["depends_on_id"] for dep in pr["dependencies"] if dep["type"] == "tracks"} == {s.BD["mapped/E1"], s.BD["mapped/E2"]}
