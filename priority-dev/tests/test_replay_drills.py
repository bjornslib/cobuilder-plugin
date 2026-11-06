"""The failure drills of the replay (slice 7, moved to the one propose call in slice 21). Stub models only.

The contract is in the docstring of `replay_support.py`. A 429, malformed output, an unknown kind, and a
timeout each end as an Abstain with a logged reason. No exception escapes, and nothing is silent. The drills
give only the reasons that the interpreter still has: `model_error` and `invalid_output`.
1. The drills that the replay runs on its own, and what they leave in the report, the rows, and the log
2. The same faults from the model of the replay: each one is an Abstain, and the rest of the run goes on
"""
from __future__ import annotations

import pytest

from interpret_support import no_live_call  # noqa: F401
from replay_support import (DRILLS, INTERPRETER_REASONS, OUTCOMES, Plan, StubModel, bullet, counts, replay,
                            sections, split, write_world)

ONE = {"alpha": Plan()}


@pytest.fixture(scope="module")
def drilled(tmp_path_factory):
    """A replay of one healthy session. Each Abstain of the run comes from a drill."""
    root = write_world(tmp_path_factory.mktemp("fixtures"), ONE)
    return replay(root, tmp_path_factory.mktemp("out"), interp=StubModel("interpreter", ONE),
                  digest=StubModel("digest", ONE))


# ---- 1. the drills of the replay ---------------------------------------------

def test_the_replay_ends_with_0(drilled):
    assert drilled.code == 0


def test_the_report_names_the_reason_of_each_drill(drilled):
    lines = sections(drilled.report)["Failure drills"]
    assert {name: bullet(lines, name) for name in DRILLS} == DRILLS


def test_every_drill_ends_with_a_reason_that_the_interpreter_still_gives(drilled):
    lines = sections(drilled.report)["Failure drills"]
    reasons = {line.split(":", 1)[1].strip() for line in lines if line.startswith("- ") and ":" in line}
    assert reasons and reasons <= INTERPRETER_REASONS, f"a drill gave {reasons - INTERPRETER_REASONS}"


def test_the_drills_are_not_counted_with_the_run(drilled):
    report = sections(drilled.report)
    for name in ("json", "chat"):
        assert counts(split(report[f"Adapter: {name}"], "### ")["Abstain reasons"]) == {}
        assert int(bullet(report[f"Adapter: {name}"], "rate-limit errors")) == 0
    assert [r["abstain_reason"] for r in drilled.results()] == [None, None]


def test_the_drills_use_their_own_models_and_leave_rows_of_their_own(drilled):
    assert len(drilled.interp.seen) == 2  # alpha: one call for each of the two adapters, and no drill
    assert len(drilled.digest.seen) == 1
    rows = drilled.rows("drills")
    errors = [r["error"] for r in rows if "error" in r]
    assert any("429" in e for e in errors), "no row of the 429 drill"
    assert any("TimeoutError" in e for e in errors), "no row of the timeout drill"
    assert any(r["valid"] is False and r.get("error", "").startswith("invalid_output") for r in rows), (
        "no row of a reply that does not parse")
    assert all(isinstance(r["seconds"], float) and r["adapter"] == "chat" for r in rows)


def test_each_drill_logs_its_reason(drilled):
    text = [r.getMessage() for r in drilled.logs.records]
    for reason, least in (("model_error", 2), ("invalid_output", 1)):
        assert sum(reason in t for t in text) >= least, f"{reason} was logged fewer than {least} times"
    assert any("429" in t for t in text) and any("TimeoutError" in t for t in text)


# ---- 2. the faults from the model of the replay ------------------------------

FAULTS = {"429": ("model_error", "429"), "timeout": ("model_error", "TimeoutError"),
          "malformed": ("invalid_output", "steps"), "unknown_kind": ("invalid_output", "launch_missile")}


@pytest.mark.parametrize("fault", FAULTS)
def test_a_fault_of_the_model_ends_as_an_abstain_and_the_run_goes_on(tmp_path, fault):
    plans = {"alpha": Plan(fault=fault), "bravo": Plan(kinds=("reply", "send_feedback"), needs_human=False)}
    done = replay(write_world(tmp_path / "fixtures", plans), tmp_path / "out",
                  interp=StubModel("interpreter", plans), digest=StubModel("digest", plans))
    reason, text = FAULTS[fault]
    assert done.code == 0
    for line in done.results():
        expected = reason if line["session"] == "alpha" else None
        assert line["abstain_reason"] == expected, line
        if expected:
            assert text in line["abstain_detail"], line
        else:
            assert line["steps"] == 2
    assert any("alpha" in r.getMessage() and reason in r.getMessage() for r in done.logs.records)


def test_a_session_after_a_fault_is_still_replayed(tmp_path):
    done = replay(write_world(tmp_path / "fixtures"), tmp_path / "out", "--concurrency", "1")
    assert done.code == 0
    assert {r["session"]: (r["abstain_reason"], r["steps"]) for r in done.results() if r["adapter"] == "chat"} == OUTCOMES
