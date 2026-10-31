"""Slice 19: optimise writes per-stop rows for its own evaluations (Prediction shape since slice 21).

The contract: a compile run on made-up examples writes one row per stop with
session, stop, score, parts, and gate outcome, in the same shape as the runner
rows. The rows recompute the reported means. The compiled program returns the
slice 21 `dspy.Prediction`, and an abstain names its reason in the gate column.
No test makes a model call: the teleprompter, the program, and the judge are
all stubbed.
"""
from __future__ import annotations

import contextlib
import io
import json
import re

import pytest

from eval_support import write_eval_world
from fixtures_support import STOPS_PER_SESSION, require, stop_key
from interpret_support import dspy
from optimise_support import BUDGET, CLASS_BY_OPTIMISER, SEED, block_live_calls
from test_judge_payload import JUDGE_NOTES, judge_api, recording_stub

CODE = {"session_id": "made-up-session", "author": "interpreter"}


def _pass():
    """A program output with one quiet step and no abstain."""
    return dspy.Prediction(status="continuing", needs_human=False, priority="P3",
                           steps=[{"kind": "continue"} | CODE], abstain=None)


def _fault():
    """A program output that the schema gate abstained, with no step."""
    return dspy.Prediction(status=None, needs_human=None, priority=None, steps=[],
                           abstain={"reason": "invalid_output", "detail": "steps: the kind launch_missile is not known",
                                    "raw": "[[ ## steps ## ]]\n[{\"kind\": \"launch_missile\"}]"})


class CannedProgram:
    """Return the first output once, then the rest, whatever brief each call carries."""

    def __init__(self, first, rest):
        self._first, self._rest, self._calls = first, rest, 0

    def __call__(self, *args, **kwargs):
        self._calls += 1
        return self._first if self._calls == 1 else self._rest

    def named_predictors(self):
        return []


class StubOptimiser:
    """A stub teleprompter whose compile returns the canned program."""

    def __init__(self, canned):
        self._canned = canned

    def compile(self, *args, **kwargs):
        return self._canned


def run_optimise_with_stubs(monkeypatch, tmp_path, canned, optimiser="bootstrap"):
    """Run `priority optimise` with a stub teleprompter, program, and key.

    Return the exit code, the printed text, and the split parts.
    """
    manifest_path, labels_path, real_dir, parts = write_eval_world(
        tmp_path, payloads=[{"kind": "continue"}])
    import dspy.teleprompt as teleprompt

    def factory(*args, **kwargs):
        return StubOptimiser(canned)

    monkeypatch.setattr(teleprompt, CLASS_BY_OPTIMISER[optimiser], factory)
    monkeypatch.setattr(dspy, CLASS_BY_OPTIMISER[optimiser], factory, raising=False)
    block_live_calls(monkeypatch)
    interpreter_mod = require("priority.interpreter")
    monkeypatch.setattr(interpreter_mod, "Interpreter", lambda *args, **kwargs: canned)
    monkeypatch.chdir(tmp_path)
    from priority.cli import main

    code, out = None, io.StringIO()
    with contextlib.redirect_stdout(out):
        code = main(["optimise", "--optimiser", optimiser,
                     "--manifest", str(manifest_path),
                     "--labels", str(labels_path),
                     "--real-dir", str(real_dir),
                     "--budget", str(BUDGET), "--seed", str(SEED)])
    return code, out.getvalue(), parts


def read_rows(tmp_path):
    """The per-stop rows of the single rows file, or an assertion failure."""
    found = sorted((tmp_path / "probes" / "programs").glob("*-rows.jsonl"))
    assert found, "optimise wrote no per-stop rows file"
    rows = [json.loads(line) for line in found[0].read_text().splitlines() if line.strip()]
    assert rows, "the per-stop rows file is empty"
    return rows


def train_stops(parts) -> set:
    return {(session, stop_key(number)) for session in parts["train"] for number in range(1, STOPS_PER_SESSION + 1)}


def test_optimise_writes_one_row_per_stop(monkeypatch, tmp_path):
    monkeypatch.setattr(judge_api(), "judge", recording_stub([], 0.8, JUDGE_NOTES))
    code, printed, parts = run_optimise_with_stubs(monkeypatch, tmp_path, CannedProgram(_pass(), _pass()))
    assert code == 0, f"optimise failed: {printed[-500:]}"
    rows = read_rows(tmp_path)
    for row in rows:
        assert {"session", "stop", "score", "parts", "gate"} <= set(row), \
            f"a row lacks the runner columns: {row}"
    assert len({(row["session"], row["stop"]) for row in rows}) == len(rows), "a stop has two rows"
    assert train_stops(parts) <= {(row["session"], row["stop"]) for row in rows}, "train stops lack rows"
    assert all(row["gate"] == "pass" for row in rows), f"a clean stop carries a gate: {rows}"
    assert all(row["score"] == pytest.approx(0.8) for row in rows), "a row score is not the judge score"
    assert all(row["parts"] == JUDGE_NOTES for row in rows), "a row lost the judge per-part notes"


def test_optimise_rows_recompute_the_reported_means(monkeypatch, tmp_path):
    monkeypatch.setattr(judge_api(), "judge", recording_stub([], 0.8, JUDGE_NOTES))
    code, printed, parts = run_optimise_with_stubs(monkeypatch, tmp_path, CannedProgram(_fault(), _pass()))
    assert code == 0, f"optimise failed: {printed[-500:]}"
    rows = read_rows(tmp_path)
    match = re.search(r"train overall (\d+\.\d+)", printed)
    assert match, f"optimise printed no train overall: {printed[-500:]}"
    mean = sum(row["score"] for row in rows) / len(rows)
    assert float(match.group(1)) == pytest.approx(mean), \
        f"the printed overall {match.group(1)} is not the rows mean {mean:.3f}"
    assert train_stops(parts) <= {(row["session"], row["stop"]) for row in rows}, "train stops lack rows"
    faults = [row for row in rows if row["gate"] != "pass"]
    assert any(row["gate"] == "invalid_output" for row in faults), f"no row names the abstain reason: {faults}"
    assert all(row["score"] == pytest.approx(0.0) for row in faults), "a gate-fault row scores above zero"
    assert all((row["session"], row["stop"]) in train_stops(parts) for row in faults), \
        "a gate-fault row names no train stop"
