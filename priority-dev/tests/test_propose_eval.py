"""Slice 21 RED: `priority eval` scores the program's Prediction directly.

The contract. `runner.run` calls the program on each stop brief and scores the
`dspy.Prediction` that it returns, with no `to_prediction` step. The judge
gets the predicted payload object with the code-set fields removed and the
reference object `{"priority": <label priority>, "steps": <label payloads>}`.
The interpreter has no variant, so `eval --variant` is an argument error. The
world is made up, and the program and the judge are stubs.
"""
from __future__ import annotations

import contextlib
import io

import pytest

from eval_support import StubInterpreter, write_eval_world
from fixtures_support import make_label, require
from interpret_support import dspy, no_live_call  # noqa: F401
from judge_ref_support import CODE, JudgeRecorder, ask_step, install_judge, reply_step, stripped

PREDICTED = [reply_step(), ask_step()]


class PredictionProgram(StubInterpreter):
    """A stub program that returns one real dspy Prediction with code-set fields on each step."""

    def __init__(self):
        super().__init__([None])

    def __call__(self, *args, **kwargs):
        return dspy.Prediction(status="waiting_answer", needs_human=True, priority="P2",
                               steps=[item | CODE for item in PREDICTED], abstain=None)


def run_eval(monkeypatch, tmp_path, *extra):
    """Run `priority eval --split train` on the made-up world. Return the code, the text, and the judge."""
    judge = install_judge(monkeypatch, JudgeRecorder(0.5))
    interpreter = require("priority.interpreter")
    manifest_path, labels_path, real_dir, _ = write_eval_world(tmp_path, payloads=[ask_step()])
    monkeypatch.setattr(interpreter, "Interpreter", lambda *a, **k: PredictionProgram())
    from priority.cli import main

    code, out = None, io.StringIO()
    with contextlib.suppress(SystemExit), contextlib.redirect_stdout(out), contextlib.redirect_stderr(io.StringIO()):
        code = main(["eval", "--split", "train", "--manifest", str(manifest_path), "--labels", str(labels_path),
                     "--real-dir", str(real_dir), "--log-dir", str(tmp_path / "logs"), *extra])
    return code, out.getvalue(), judge


def test_eval_sends_the_program_prediction_to_the_judge(monkeypatch, tmp_path):
    code, printed, judge = run_eval(monkeypatch, tmp_path)
    assert code == 0, printed[-500:]
    judged = [call for call in judge.calls if "steps" in (call["predicted"] or {})]
    assert judged, "no program Prediction reached the judge"
    expected_predicted = {"priority": "P2", "steps": stripped(PREDICTED)}
    assert all(call["predicted"] == expected_predicted for call in judged), \
        f"the judge saw {judged[0]['predicted']}, not the program Prediction"
    # Only stop 1 of the made-up transcript builds a brief, and its label is the template stop 1.
    reference = {"priority": make_label(1)["priority"], "steps": [ask_step()]}
    assert all(call["expected"] == reference for call in judged), f"the judge saw {judged[0]['expected']}"


def test_eval_reference_carries_the_label_priority(monkeypatch, tmp_path):
    _, _, judge = run_eval(monkeypatch, tmp_path)
    labels = {make_label(n)["priority"] for n in range(1, 6)}
    priorities = {call["expected"].get("priority") for call in judge.calls if isinstance(call["expected"], dict)}
    assert priorities == labels, f"the reference priorities {priorities} are not the label priorities {labels}"


def test_the_runner_has_no_to_prediction():
    assert not hasattr(require("priority.evaluation.runner"), "to_prediction")


@pytest.mark.parametrize("variant", ["chain", "combined"])
def test_eval_has_no_variant_option(monkeypatch, tmp_path, variant):
    code, _, _ = run_eval(monkeypatch, tmp_path, "--variant", variant)
    assert code is None, f"eval accepted --variant {variant} and exited {code}"
