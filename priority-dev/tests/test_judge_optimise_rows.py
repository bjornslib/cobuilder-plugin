"""Slice 19 RED: optimise writes per-stop rows for its own evaluations.

The contract: a compile run on made-up examples writes one row per stop with
session, stop, score, parts, and gate outcome, in the same shape as the runner
rows. The rows recompute the reported means. GEPA leaves no per-stop rows
today, and that gap cost the valset rescore. Two tests only. No test makes a
model call: the teleprompter, the interpreter, and the judge are all stubbed.
"""
from __future__ import annotations

import contextlib
import io
import json
import re

import pytest

from eval_support import FACT_FIELDS, write_eval_world
from fixtures_support import STOPS_PER_SESSION, require, stop_key
from optimise_support import BUDGET, CLASS_BY_OPTIMISER, SEED, block_live_calls
from test_judge_payload import JUDGE_NOTES, judge_api, recording_stub


def _facts():
    """Facts for a quiet continuing stop, in model units."""
    models = require("priority.interpreter.models")
    signatures = require("priority.interpreter.signatures")
    return models.Facts(status="continuing", needs_human=False, answer_class="none",
                        risk=signatures.RISK["low"], priority_hint=signatures.HINT["can_wait"],
                        confidence={name: 0.9 for name in FACT_FIELDS})


def _pass_interp():
    """A real Interpretation with one quiet step and no abstain."""
    models = require("priority.interpreter.models")
    step = models.Continue(session_id="made-up-session", author="interpreter",
                           evidence_quote="the north shed log", confidence=0.9)
    proposal = models.Proposal(proposal_id="p-made-up", brief_id="b-made-up", steps=(step,))
    return models.Interpretation(brief_id="b-made-up", facts=_facts(),
                                 advice=models.Advice(proposal=proposal))


def _fault_interp():
    """A real Interpretation abstained by the gate, with no proposal."""
    models = require("priority.interpreter.models")
    return models.Interpretation(
        brief_id="b-made-up", facts=_facts(),
        abstained=models.Abstain(reason="kind_not_allowed",
                                 detail="step 1: the kind launch_missile is not allowed"))


class CannedInterpreter:
    """Return the fault once, then the pass, whatever brief each call carries."""

    def __init__(self, first, rest):
        self._first, self._rest, self._calls = first, rest, 0

    def __call__(self, brief):
        self._calls += 1
        return self._first if self._calls == 1 else self._rest


class CallableCompiled:
    """A stub compiled program that answers through the canned interpreter."""

    def __init__(self, canned):
        self._canned = canned

    def __call__(self, brief):
        return self._canned(brief)


class StubOptimiser:
    """A stub teleprompter whose compile returns the callable program."""

    def __init__(self, canned):
        self._canned = canned

    def compile(self, *args, **kwargs):
        return CallableCompiled(self._canned)


def run_optimise_with_stubs(monkeypatch, tmp_path, canned, optimiser="bootstrap"):
    """Run `priority optimise` with a stub teleprompter, interpreter, and key.

    Return the exit code, the printed text, and the split parts.
    """
    manifest_path, labels_path, real_dir, parts = write_eval_world(
        tmp_path, payloads=[{"kind": "continue"}])
    import dspy
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


def test_optimise_writes_one_row_per_stop(monkeypatch, tmp_path):
    api = judge_api()
    monkeypatch.setattr(api, "judge", recording_stub([], 0.8, JUDGE_NOTES))
    code, printed, parts = run_optimise_with_stubs(monkeypatch, tmp_path,
                                                   CannedInterpreter(_pass_interp(), _pass_interp()))
    assert code == 0, f"optimise failed: {printed[-500:]}"
    rows = read_rows(tmp_path)
    for row in rows:
        assert {"session", "stop", "score", "parts", "gate"} <= set(row), \
            f"a row lacks the runner columns: {row}"
    assert len({(row["session"], row["stop"]) for row in rows}) == len(rows), \
        "a stop has two rows"
    expected = {(session, stop_key(number)) for session in parts["train"]
                for number in range(1, STOPS_PER_SESSION + 1)}
    assert expected <= {(row["session"], row["stop"]) for row in rows}, \
        "train stops lack rows"
    assert all(row["gate"] == "pass" for row in rows), f"a clean stop carries a gate: {rows}"
    assert all(row["score"] == pytest.approx(0.8) for row in rows), \
        "a row score is not the judge score"
    assert all(row["parts"] == JUDGE_NOTES for row in rows), \
        "a row lost the judge per-part notes"


def test_optimise_rows_recompute_the_reported_means(monkeypatch, tmp_path):
    api = judge_api()
    monkeypatch.setattr(api, "judge", recording_stub([], 0.8, JUDGE_NOTES))
    code, printed, parts = run_optimise_with_stubs(monkeypatch, tmp_path,
                                                   CannedInterpreter(_fault_interp(), _pass_interp()))
    assert code == 0, f"optimise failed: {printed[-500:]}"
    rows = read_rows(tmp_path)
    match = re.search(r"train overall (\d+\.\d+)", printed)
    assert match, f"optimise printed no train overall: {printed[-500:]}"
    mean = sum(row["score"] for row in rows) / len(rows)
    assert float(match.group(1)) == pytest.approx(mean), \
        f"the printed overall {match.group(1)} is not the rows mean {mean:.3f}"
    expected = {(session, stop_key(number)) for session in parts["train"]
                for number in range(1, STOPS_PER_SESSION + 1)}
    assert expected <= {(row["session"], row["stop"]) for row in rows}, \
        "train stops lack rows"
    faults = [row for row in rows if row["gate"] != "pass"]
    assert faults, "no row carries a gate outcome"
    assert all(row["score"] == pytest.approx(0.0) for row in faults), \
        "a gate-fault row scores above zero"
    assert all(row["gate"] == "kind_not_allowed" for row in faults), \
        "a gate-fault row names no gate outcome"
    assert all(row["parts"] == [] for row in faults), \
        "a gate-fault row carries judge notes without a judgement"
    assert all((fault["session"], fault["stop"]) in expected for fault in faults), \
        "a gate-fault row names no train stop"
