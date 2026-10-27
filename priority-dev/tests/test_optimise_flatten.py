"""The optimiser metrics must score real Interpretations, not raw ones.

`metric.score` reads top-level status/steps/quotes/abstain fields. A raw
Interpretation nests those under .facts/.advice/.abstained, so scoring it
raw floors every candidate at 0.2 and GEPA cannot tell instructions apart.
These tests feed real Interpretations through `gepa_feedback` and
`plain_score` and pin the wrappers to the eval runner's `to_prediction`
numbers. No test makes a model call.
"""
from __future__ import annotations

from eval_support import (BRIEF_TEXT, FACT_FIELDS, QUOTE_IN_BRIEF,  # noqa: F401
                          make_example, write_eval_world)
from fixtures_support import make_label
from interpret_support import DONE, dummy, no_live_call  # noqa: F401
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


def test_raw_interpretation_floors_at_constant():
    """A raw Interpretation scores 0.2: facts 0, steps 0, grounding and validity vacuous."""
    interp, label = _waiting_interpretation()
    metric = require("priority.evaluation.metric")
    assert metric.score(make_example(label), interp)[0] == 0.2


def test_wrappers_match_runner_on_waiting_stop():
    """The wrappers flatten before scoring, so a perfect stop scores 1.0 through them."""
    interp, label = _waiting_interpretation()
    example = make_example(label)
    runner = require("priority.evaluation.runner")
    metric = require("priority.evaluation.metric")
    optimise = require("priority.optimise")
    expected, _ = metric.score(example, runner.to_prediction(interp))
    assert expected == 1.0
    assert optimise.plain_score(example, interp) == expected
    assert optimise.gepa_feedback(example, interp).score == expected


def test_wrappers_match_runner_on_abstain():
    """An abstained stop scores the runner's number through both wrappers."""
    models = require("priority.interpreter.models")
    interp = models.Interpretation(brief_id="b", abstained=models.Abstain(
        reason="no_agent_reply", detail="the final reply is empty"))
    example = make_example(make_label(2))
    runner = require("priority.evaluation.runner")
    metric = require("priority.evaluation.metric")
    optimise = require("priority.optimise")
    expected, _ = metric.score(example, runner.to_prediction(interp))
    assert expected == 0.2
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
