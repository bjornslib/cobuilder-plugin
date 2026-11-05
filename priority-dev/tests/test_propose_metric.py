"""Slice 21 RED: the judge sees every stop. Code pins the score of an abstain only.

The contract. `metric.score(example, prediction, trace=None, pred_name=None,
pred_trace=None) -> (float, str)`. The reference is `{"priority":
example.priority, "steps": example.expected_payloads}`, and an example with no
`expected_payloads` raises ValueError. The judge gets the brief text, the
predicted payload object `{"priority", "steps"}` with the code-set fields
removed (or `{"abstain": {reason, detail, raw}}`), and the reference, exactly
once for each stop. Code pins one score whatever the judge returns: an
abstain scores 0. In every other case the clamped judge score is final, also
for a missing payload, an unwanted payload, and two empty payloads. The
feedback holds the abstain note first, then the judge notes. The judge is a
stub here. `test_metric_unpinned.py` holds the rest of the unpinned contract.
"""
from __future__ import annotations

import pytest

from interpret_support import dspy, no_live_call  # noqa: F401
from judge_ref_support import (BRIEF_TEXT, CODE, JudgeRecorder, ask_step, install_judge, reply_step, require,
                               stripped)

NOTE = "judge: the made-up reply answers the paint question."


def example(reference, priority: str = "P1"):
    """One made-up metric example with a reference payload."""
    return dspy.Example(brief_text=BRIEF_TEXT, priority=priority, expected_payloads=reference)


def prediction(steps=(), *, priority: str = "P2", status: str = "waiting_answer", abstain=None):
    """One made-up Prediction as forward returns it, with code-set fields on each step."""
    return dspy.Prediction(status=status, needs_human=True, priority=priority,
                           steps=[item | CODE for item in steps], abstain=abstain)


def score(monkeypatch, judge_score: float, ex, pred, *gepa_args):
    """Score one stop with a stub judge. Return the score, the feedback, and the judge calls."""
    judge = install_judge(monkeypatch, JudgeRecorder(judge_score, [NOTE]))
    value, feedback = require("priority.evaluation.metric").score(ex, pred, *gepa_args)
    return value, feedback, judge.calls


# ---- The judge input -------------------------------------------------------------


def test_the_judge_gets_both_payload_objects_once(monkeypatch):
    steps = [reply_step(), ask_step()]
    _, _, calls = score(monkeypatch, 0.6, example([ask_step()], "P1"), prediction(steps, priority="P2"))
    assert len(calls) == 1, f"the judge was called {len(calls)} times"
    assert calls[0]["brief_text"] == BRIEF_TEXT
    assert calls[0]["predicted"] == {"priority": "P2", "steps": stripped(steps)}
    assert calls[0]["expected"] == {"priority": "P1", "steps": [ask_step()]}


def test_the_judge_score_is_final_outside_the_pinned_cases(monkeypatch):
    value, feedback, _ = score(monkeypatch, 0.6, example([ask_step()]), prediction([reply_step()]))
    assert value == pytest.approx(0.6)
    assert NOTE in feedback


@pytest.mark.parametrize("judged,clamped", [(1.5, 1.0), (-0.5, 0.0)])
def test_the_metric_clamps_the_judge_score(monkeypatch, judged, clamped):
    value, _, _ = score(monkeypatch, judged, example([ask_step()]), prediction([ask_step()]))
    assert value == pytest.approx(clamped)


def test_an_example_with_no_reference_raises(monkeypatch):
    install_judge(monkeypatch, JudgeRecorder(0.9, [NOTE]))
    with pytest.raises(ValueError):
        require("priority.evaluation.metric").score(dspy.Example(brief_text=BRIEF_TEXT, priority="P1"),
                                                    prediction([reply_step()]))


# ---- The one pinned case: an abstain ----------------------------------------------

ABSTAIN = {"reason": "invalid_output", "detail": "steps: the kind launch_missile is not known",
           "raw": "[[ ## steps ## ]]\n[{\"kind\": \"launch_missile\"}]"}


@pytest.mark.parametrize("reference", [[ask_step()], []], ids=["reference with steps", "empty reference"])
def test_an_abstain_scores_zero_and_the_judge_sees_the_abstain(monkeypatch, reference):
    value, feedback, calls = score(monkeypatch, 0.9, example(reference), prediction(abstain=dict(ABSTAIN)))
    assert value == pytest.approx(0.0)
    assert len(calls) == 1, "the abstain never reached the judge"
    assert calls[0]["predicted"] == {"abstain": ABSTAIN}
    assert "invalid_output" in feedback and NOTE in feedback
    assert feedback.index("invalid_output") < feedback.index(NOTE), "the judge note comes before the abstain note"


# ---- The cases that code no longer pins: the judge score is final -------------------


def test_a_missing_payload_gets_the_judge_score_and_the_judge_notes(monkeypatch):
    value, feedback, calls = score(monkeypatch, 0.4, example([ask_step()]), prediction([], status="continuing"))
    assert value == pytest.approx(0.4), "a reference with steps against no steps did not get the judge score"
    assert len(calls) == 1, "a missing payload never reached the judge"
    assert feedback == NOTE, f"the feedback is not the judge notes alone: {feedback!r}"


def test_an_unwanted_payload_gets_the_judge_score_and_the_judge_notes(monkeypatch):
    steps = [reply_step(), {"kind": "snooze", "until_event": "turn_end"}]
    value, feedback, calls = score(monkeypatch, 0.9, example([]), prediction(steps))
    assert value == pytest.approx(0.9), "a reference [] against steps did not get the judge score"
    assert len(calls) == 1, "an unwanted payload never reached the judge"
    assert feedback == NOTE, f"the feedback is not the judge notes alone: {feedback!r}"


def test_both_empty_gets_the_judge_score_and_the_judge_notes(monkeypatch):
    value, feedback, calls = score(monkeypatch, 0.2, example([]), prediction([]))
    assert value == pytest.approx(0.2), "two empty lists did not get the judge score"
    assert len(calls) == 1, "two empty payloads never reached the judge"
    assert feedback == NOTE, f"the feedback is not the judge notes alone: {feedback!r}"


# ---- The GEPA path -----------------------------------------------------------------


def test_gepa_feedback_returns_the_metric_score_and_feedback_as_a_prediction(monkeypatch):
    ex, pred = example([ask_step()]), prediction([ask_step(multi=True)])
    value, feedback, _ = score(monkeypatch, 0.7, ex, pred, None, "propose", None)
    wrapped = require("priority.optimise").gepa_feedback(ex, pred, None, "propose", None)
    assert isinstance(wrapped, dspy.Prediction)
    assert (wrapped.score, wrapped.feedback) == (value, f"Score: {value:.2f} of 1.00. {feedback}")
    assert wrapped.score == pytest.approx(0.7)


def test_gepa_feedback_scores_an_abstain_like_the_metric(monkeypatch):
    ex, pred = example([ask_step()]), prediction(abstain=dict(ABSTAIN))
    value, feedback, calls = score(monkeypatch, 0.9, ex, pred, None, "propose", None)
    wrapped = require("priority.optimise").gepa_feedback(ex, pred, None, "propose", None)
    prefixed = f"Score: {value:.2f} of 1.00. {feedback}"
    assert (wrapped.score, wrapped.feedback) == (value, prefixed) == (0.0, prefixed)
    assert len(calls) == 2, "gepa_feedback did not send the abstain to the judge"
