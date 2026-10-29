"""The optimiser metrics score real Interpretations like the eval runner does.

`gepa_feedback` and `plain_score` must give the number that the runner
gives through `to_prediction`. Since slice 20, `to_prediction` carries the
payloads, so both paths reach the judge with the same steps. The judge is a
stub here, and no test makes a model call.
"""
from __future__ import annotations

import pytest
from eval_support import (BRIEF_TEXT, FACT_FIELDS, QUOTE_IN_BRIEF,  # noqa: F401
                          make_example, write_eval_world)
from fixtures_support import make_label
from interpret_support import DONE, dummy, no_live_call  # noqa: F401
from judge_ref_support import JudgeRecorder, install_judge
from optimise_support import require


def _waiting_interpretation():
    """One waiting-stop Interpretation whose facts, steps, and quotes match its label."""
    models = require("priority.interpreter.models")
    label = make_label(2)
    facts = models.Facts(status="continuing", needs_human=False, answer_class="none",
                         risk=0.15, priority_hint=0.15,
                         confidence={field: 0.9 for field in FACT_FIELDS})
    step = models.Continue(session_id="made-up-session-01",
                           evidence_quote=QUOTE_IN_BRIEF, confidence=0.9)
    proposal = models.Proposal(proposal_id="p-b", brief_id="b", steps=(step,))
    interp = models.Interpretation(brief_id="b", facts=facts,
                                   advice=models.Advice(question=None, proposal=proposal))
    return interp, label


def test_wrappers_match_runner_on_waiting_stop(monkeypatch):
    """The runner path and both wrappers send the same steps to the judge."""
    judge = install_judge(monkeypatch, JudgeRecorder(0.7))
    interp, label = _waiting_interpretation()
    example = make_example(label) | {"expected_payloads": [{"kind": "continue"}]}
    runner = require("priority.evaluation.runner")
    metric = require("priority.evaluation.metric")
    optimise = require("priority.optimise")
    expected, _ = metric.score(example, runner.to_prediction(interp))
    assert expected == pytest.approx(0.7), f"the runner path scored {expected}, not the judge score"
    assert optimise.plain_score(example, interp) == expected
    assert optimise.gepa_feedback(example, interp).score == expected
    assert len(judge.calls) == 3 and all(call["predicted"] == judge.calls[0]["predicted"]
                                         for call in judge.calls), \
        "the runner path and the wrappers sent different steps to the judge"


def test_wrappers_match_runner_on_abstain():
    """An abstained stop scores 0 with its reason through both wrappers."""
    models = require("priority.interpreter.models")
    interp = models.Interpretation(brief_id="b", abstained=models.Abstain(
        reason="no_agent_reply", detail="the final reply is empty"))
    example = make_example(make_label(2)) | {"expected_payloads": [{"kind": "continue"}]}
    runner = require("priority.evaluation.runner")
    metric = require("priority.evaluation.metric")
    optimise = require("priority.optimise")
    expected, feedback = metric.score(example, runner.to_prediction(interp))
    assert expected == pytest.approx(0.0)
    assert "no_agent_reply" in feedback
    assert optimise.plain_score(example, interp) == expected
    assert optimise.gepa_feedback(example, interp).score == expected


def test_done_stop_example_threads_final_to_notify(tmp_path):
    """A trainset example carries the final reply, and forward on it reaches notify."""
    manifest_path, labels_path, real_dir, _parts = write_eval_world(tmp_path)
    optimise = require("priority.optimise")
    examples, _parts = optimise.build_trainset(manifest_path, labels_path, real_dir)
    example = examples[0]
    assert example.final_text and example.final_text in example.brief_text
    out = require("priority.interpreter").Interpreter(lm=dummy([DONE]))(
        brief_text=example.brief_text, final_text=example.final_text)
    assert out.abstained is None
    assert [step.kind for step in out.advice.proposal.steps] == ["notify"]
    runner = require("priority.evaluation.runner")
    metric = require("priority.evaluation.metric")
    expected, _ = metric.score(example, runner.to_prediction(out))
    assert optimise.plain_score(example, out) == expected
    assert optimise.gepa_feedback(example, out).score == expected
