"""The repair planner: one test per rule, and the holds, idempotence, and network limits."""

from __future__ import annotations

import sys
from dataclasses import replace
from pathlib import Path

SHARED = Path(__file__).resolve().parent.parent / "shared"
sys.path.insert(0, str(SHARED))

from tracker_port import repair_status  # noqa: E402
from tracker_port.record import TrackerRecord  # noqa: E402
from tracker_port.repair_status import plan_repair  # noqa: E402


def rec(rid, kind, parent=None, life="open", env=None, tracks=()):
    return TrackerRecord(rid, kind, parent, (), life, None, env or {}, rid, tracks=tracks)


def prog(name, stage=None, life="open"):
    return rec(name, "program", life=life, env={"stage": stage} if stage else {})


def rules(plan, key="changes"):
    return [(e["id"], e["action"], e["rule"]) for e in plan[key]]


def test_stamp_from_goal():
    plan = plan_repair([prog("d")], {"d": "approved"}, set())
    assert rules(plan) == [("d", "stamp", "stamp-from-goal")]
    assert plan["changes"][0]["stage"] == "approved"
    assert plan["changes"][0]["detail"] == "legacy goal stage approved"


def test_create_from_design():
    plan = plan_repair([], {"d": "backlog"}, set())
    assert rules(plan) == [("d", "create", "create-from-design")]
    assert plan["changes"][0]["stage"] == "backlog"


def test_stage_closes_from_tracker_and_goal():
    records = [prog("d", "superseded"), rec("d/E1", "epic"), rec("e", "program"), rec("e/E1", "epic")]
    plan = plan_repair(records, {"e": "implemented"}, set())
    by_id = {c["id"]: c for c in plan["changes"] if c["action"] == "close"}
    assert by_id["d/E1"]["detail"] == "design d is at superseded, from the tracker"
    assert by_id["e/E1"]["detail"] == "design e is at implemented, from goal.json"


def test_pr_record_merged():
    records = [prog("d"), rec("d/E1", "epic"), rec("pr1", "pr", life="closed", tracks=("d/E1",))]
    plan = plan_repair(records, {}, {"d/E1"})
    assert rules(plan) == [("d/E1", "close", "pr-record-merged")]


def test_index_merged_pr():
    plan = plan_repair([prog("d"), rec("d/E1", "epic")], {}, {"d/E1"})
    assert rules(plan) == [("d/E1", "close", "index-merged-pr")]


def test_live_stage_with_merged_pr_holds():
    plan = plan_repair([prog("d", "approved"), rec("d/E1", "epic")], {}, {"d/E1"})
    assert plan["changes"] == []
    assert rules(plan, "holds") == [("d/E1", "hold", "live-stage-with-merged-pr")]
    assert "approved" in plan["holds"][0]["detail"]


def test_no_design_no_stage():
    plan = plan_repair([prog("d"), rec("d/E1", "epic"), rec("d/E2", "epic")], {}, set())
    assert rules(plan, "unresolved") == [("d", "report", "no-design-no-stage")]
    assert plan["unresolved"][0]["detail"] == "2 open epics"


def test_no_pr_evidence():
    records = [prog("d"), rec("d/E1", "epic", env={"branch": "feature/x"}), rec("d/E2", "epic")]
    plan = plan_repair(records, {}, set())
    assert rules(plan, "unchecked") == [("d/E1", "unchecked", "no-pr-evidence")]


def test_implemented_epic_without_work_closes():
    records = [prog("d", "implemented"), rec("d/E1", "epic", env={"state": "backlog"})]
    plan = plan_repair(records, {}, set())
    assert rules(plan) == [("d/E1", "close", "stage-closes")]
    assert plan["holds"] == []


def test_open_slices_of_closed_epic_close():
    records = [prog("d", "implemented"), rec("d/E1", "epic", life="closed"), rec("d/E1/1", "slice", "d/E1")]
    plan = plan_repair(records, {}, set())
    assert rules(plan) == [("d/E1/1", "close", "stage-closes")]
    assert plan["changes"][0]["kind"] == "slice"


def test_second_call_is_idempotent():
    records = [prog("d"), rec("d/E1", "epic"), rec("d/E1/1", "slice", "d/E1"), rec("x", "program")]
    first = plan_repair(records, {"d": "superseded", "n": "backlog"}, set())
    assert first["changes"]
    done = {c["id"] for c in first["changes"] if c["action"] == "close"}
    stamped = {c["id"]: c["stage"] for c in first["changes"] if c["action"] == "stamp"}
    updated = []
    for r in records:
        if r.id in done:
            r = replace(r, lifecycle="closed")
        if r.id in stamped:
            r = replace(r, envelope={"stage": stamped[r.id]})
        updated.append(r)
    updated.append(prog("n", "backlog"))
    assert plan_repair(updated, {"d": "superseded", "n": "backlog"}, set())["changes"] == []


def test_planner_uses_no_subprocess():
    assert "subprocess" not in Path(repair_status.__file__).read_text()
