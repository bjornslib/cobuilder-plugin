"""Slice 7, the go or no-go section of the report (RED role). Every test uses stub models and makes no live call.

The contract is in the docstring of `replay_support.py`. The section names each `abort_if` condition of the
goal file, states held, refuted, or not measured, and gives a basis from the stored rows. Only the sessions
under a folder named `real` count for condition 1. The tests use the extremes of the rule, not the
threshold in the middle.
1. The section and the goal file
2. Condition 1 for each state of the real sessions
3. Condition 2 and the conditions after it
"""
from __future__ import annotations

import json
import re

import pytest

from interpret_support import no_live_call  # noqa: F401
from replay_support import GOAL, Plan, StubModel, bullet, replay, sections, split, write_world

VERDICTS = ("held", "refuted", "not measured")
GOOD = {"alpha": Plan(), "bravo": Plan(needs_human=False)}
BAD_BOTH = {name: Plan(fault="malformed", digest_fault="malformed") for name in GOOD}
BAD_PICK = {name: Plan(fault="malformed") for name in GOOD}


def conditions() -> list[str]:
    found = json.loads(GOAL.read_text())["abort_if"]
    assert len(found) == 2
    return found


def gate(tmp_path, plans, *, subdir="real", goal=GOAL):
    """Replay the plans under the folder `subdir` and return (lines of each abort_if subsection, the run)."""
    root = write_world(tmp_path / "fixtures", plans, subdir=subdir)
    done = replay(root, tmp_path / "out", interp=StubModel("interpreter", plans), digest=StubModel("digest", plans),
                  goal=goal)
    assert done.code == 0
    return split(sections(done.report)["Go or no-go"], "### "), done


def tokens(basis: str) -> dict[str, tuple[int, int]]:
    return {m.group(1): (int(m.group(2)), int(m.group(3))) for m in re.finditer(r"\b(json|chat|digest) (\d+)/(\d+)", basis)}


# ---- 1. the section and the goal file ----------------------------------------

def test_the_section_names_each_condition_of_the_goal_file(tmp_path):
    found, _ = gate(tmp_path, GOOD)
    assert list(found) == ["abort_if 1", "abort_if 2"]
    for number, text in enumerate(conditions(), start=1):
        lines = found[f"abort_if {number}"]
        assert bullet(lines, "condition") == text
        assert bullet(lines, "verdict") in VERDICTS
        assert bullet(lines, "basis")


def test_the_conditions_come_from_the_goal_file_not_from_the_code(tmp_path):
    goal = tmp_path / "goal.json"
    goal.write_text(json.dumps({"abort_if": [*conditions(), "a third condition that only this test knows"]}))
    found, _ = gate(tmp_path, GOOD, goal=goal)
    assert list(found) == ["abort_if 1", "abort_if 2", "abort_if 3"]
    assert bullet(found["abort_if 3"], "condition") == "a third condition that only this test knows"
    assert bullet(found["abort_if 3"], "verdict") == "not measured"
    assert bullet(found["abort_if 3"], "basis")


def test_the_go_or_no_go_is_the_last_section(tmp_path):
    _, done = gate(tmp_path, GOOD)
    assert list(sections(done.report))[-1] == "Go or no-go"


# ---- 2. condition 1 ----------------------------------------------------------

def test_condition_1_is_refuted_when_the_real_stops_give_valid_grounded_output(tmp_path):
    found, done = gate(tmp_path, GOOD)
    lines = found["abort_if 1"]
    assert bullet(lines, "verdict") == "refuted"
    assert tokens(bullet(lines, "basis")) == {"json": (2, 2), "chat": (2, 2), "digest": (2, 2)}
    assert all(r["real"] is True for r in done.results())


def test_condition_1_is_held_when_neither_model_gives_output_on_the_real_stops(tmp_path):
    found, _ = gate(tmp_path, BAD_BOTH)
    lines = found["abort_if 1"]
    assert bullet(lines, "verdict") == "held"
    assert tokens(bullet(lines, "basis")) == {"json": (0, 2), "chat": (0, 2), "digest": (0, 2)}


def test_condition_1_needs_both_failures_so_a_working_digest_model_refutes_it(tmp_path):
    found, _ = gate(tmp_path, BAD_PICK)
    lines = found["abort_if 1"]
    assert bullet(lines, "verdict") == "refuted"
    assert tokens(bullet(lines, "basis")) == {"json": (0, 2), "chat": (0, 2), "digest": (2, 2)}


def test_condition_1_is_not_measured_with_no_real_stop(tmp_path):
    found, done = gate(tmp_path, GOOD, subdir="made-up")
    assert bullet(found["abort_if 1"], "verdict") == "not measured"
    assert bullet(found["abort_if 1"], "basis")
    assert all(r["real"] is False for r in done.results())


def test_a_made_up_stop_does_not_count_for_condition_1(tmp_path):
    """Good made-up sessions do not refute the condition when the one real session fails."""
    plans = {"alpha": Plan(fault="malformed", digest_fault="malformed"), "bravo": Plan(needs_human=False)}
    root = write_world(tmp_path / "fixtures", {"alpha": plans["alpha"]}, subdir="real")
    write_world(tmp_path / "fixtures", {"bravo": plans["bravo"]}, subdir="made-up")
    done = replay(root, tmp_path / "out", interp=StubModel("interpreter", plans), digest=StubModel("digest", plans))
    lines = split(sections(done.report)["Go or no-go"], "### ")["abort_if 1"]
    assert bullet(lines, "verdict") == "held"
    assert tokens(bullet(lines, "basis")) == {"json": (0, 1), "chat": (0, 1), "digest": (0, 1)}


def test_the_basis_names_only_the_adapters_of_the_run(tmp_path):
    root = write_world(tmp_path / "fixtures", GOOD, subdir="real")
    done = replay(root, tmp_path / "out", "--adapters", "chat")
    basis = bullet(split(sections(done.report)["Go or no-go"], "### ")["abort_if 1"], "basis")
    assert tokens(basis) == {"chat": (2, 2), "digest": (2, 2)}


# ---- 3. condition 2 ----------------------------------------------------------

@pytest.mark.parametrize("plans,subdir", [(GOOD, "real"), (BAD_BOTH, "real"), (GOOD, "made-up")])
def test_condition_2_is_not_measured_because_the_replay_makes_no_hook_call(tmp_path, plans, subdir):
    found, _ = gate(tmp_path, plans, subdir=subdir)
    assert bullet(found["abort_if 2"], "verdict") == "not measured"
    assert bullet(found["abort_if 2"], "basis")
