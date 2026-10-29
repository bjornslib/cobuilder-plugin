"""Slice 20 RED: the judge scores the payload only, against a reference payload.

The contract. `metric.score(example, prediction, ...)` returns `(float, str)`.
When the reference and the candidate both hold at least one step, it calls
`judge(brief_text, predicted, reference)` with two lists of step dicts. No
step holds a code-set field (`metric.CODE_FIELDS`), and neither list holds
the five facts or the label steps. A reference stored as one step dict goes
to the judge as a one-item list. Four rules never call the judge: a missing
candidate payload, a payload where none is due, both empty, and any abstain.
A stub judge note scores 0, and an example with no reference raises.
The judge is a stub in every test, so no test makes a model call.
"""
from __future__ import annotations

import dspy
import pytest

from judge_ref_support import (BRIEF_TEXT, CODE, CODE_FIELDS, FACT_FIELDS, STUB_NOTE,
                               JudgeRecorder, ask_step, candidate, install_judge, made_interp,
                               made_steps, ref_example, reply_step, require, score_of, stripped)


# ---- Item 1: payload-only judge input ------------------------------------------


def test_code_fields_constant_names_the_four_code_set_fields():
    metric = require("priority.evaluation.metric")
    assert set(getattr(metric, "CODE_FIELDS", ())) == set(CODE_FIELDS), \
        "metric.CODE_FIELDS does not name session_id, author, confidence, evidence_quote"


def test_judge_gets_both_payload_lists_with_code_fields_removed(monkeypatch):
    judge = install_judge(monkeypatch, JudgeRecorder(0.6))
    reference = [ask_step(**CODE)]
    predicted = [reply_step(**CODE), ask_step(**CODE)]
    value, _ = score_of(ref_example(reference), candidate(predicted))
    assert len(judge.calls) == 1, "the metric did not call the judge once"
    call = judge.calls[0]
    assert call["brief_text"] == BRIEF_TEXT
    assert call["predicted"] == stripped(predicted), f"predicted judge input: {call['predicted']}"
    assert call["expected"] == stripped(reference), f"reference judge input: {call['expected']}"
    assert value == pytest.approx(0.6)


def test_judge_input_holds_no_facts_no_label_steps_and_no_code_fields(monkeypatch):
    judge = install_judge(monkeypatch, JudgeRecorder(0.6))
    score_of(ref_example([reply_step(**CODE)]), candidate([reply_step("Use green.", **CODE)]))
    assert judge.calls, "the metric never called the judge"
    banned = set(FACT_FIELDS) | {"steps"} | set(CODE_FIELDS)
    for side in ("predicted", "expected"):
        value = judge.calls[0][side]
        assert isinstance(value, list), f"the {side} judge input is not a list: {value!r}"
        for step in value:
            assert isinstance(step, dict), f"a {side} step is not a dict: {step!r}"
            assert not set(step) & banned, f"the {side} step holds {sorted(set(step) & banned)}"


def test_interpretation_steps_reach_the_judge_without_code_fields(monkeypatch):
    judge = install_judge(monkeypatch, JudgeRecorder(0.6))
    steps = made_steps()
    dumped = [step.model_dump() for step in steps]
    value, _ = score_of(ref_example(dumped), made_interp(steps))
    assert judge.calls, "the metric never called the judge"
    assert judge.calls[0]["predicted"] == stripped(dumped), \
        f"the Interpretation steps reached the judge as {judge.calls[0]['predicted']}"
    assert judge.calls[0]["expected"] == stripped(dumped)
    assert value == pytest.approx(0.6)


def test_reference_stored_as_one_step_dict_reaches_the_judge_as_a_list(monkeypatch):
    judge = install_judge(monkeypatch, JudgeRecorder(0.6))
    reference = ask_step(**CODE)
    score_of(ref_example(reference), candidate([ask_step()]))
    assert judge.calls, "the metric never called the judge"
    assert judge.calls[0]["expected"] == stripped([reference]), \
        f"a one-dict reference reached the judge as {judge.calls[0]['expected']!r}"


# ---- Item 2: rules that never call the judge -----------------------------------


@pytest.mark.parametrize("status,payloads", [("continuing", []), ("blocked", "missing")])
def test_reference_with_no_candidate_payload_scores_zero_naming_the_status(
        monkeypatch, status, payloads):
    judge = install_judge(monkeypatch, JudgeRecorder(0.9))
    prediction = candidate(status=status) if payloads == "missing" else candidate(payloads, status=status)
    value, feedback = score_of(ref_example([ask_step()]), prediction)
    assert value == pytest.approx(0.0), f"a missing payload scored {value}"
    assert status in feedback, f"the note names no triage status: {feedback}"
    assert judge.calls == [], "a missing payload reached the judge"


def test_interpretation_with_no_advice_scores_zero_naming_the_status(monkeypatch):
    judge = install_judge(monkeypatch, JudgeRecorder(0.9))
    value, feedback = score_of(ref_example([ask_step()]), made_interp(status="continuing"))
    assert value == pytest.approx(0.0), f"an Interpretation with no advice scored {value}"
    assert "continuing" in feedback, f"the note names no triage status: {feedback}"
    assert judge.calls == [], "a missing payload reached the judge"


def test_payload_where_none_is_due_scores_zero_naming_each_kind(monkeypatch):
    judge = install_judge(monkeypatch, JudgeRecorder(0.9))
    payloads = [reply_step(), {"kind": "snooze", "until_event": "turn_end"}]
    value, feedback = score_of(ref_example([]), candidate(payloads))
    assert value == pytest.approx(0.0), f"a payload on a no-payload stop scored {value}"
    assert "reply" in feedback and "snooze" in feedback, f"the note names no kind: {feedback}"
    assert judge.calls == [], "a no-payload stop reached the judge"


def test_both_empty_scores_one_without_the_judge(monkeypatch):
    judge = install_judge(monkeypatch, JudgeRecorder(0.3))
    value, _ = score_of(ref_example([]), candidate([]))
    assert value == pytest.approx(1.0), f"an empty reference and an empty payload scored {value}"
    assert judge.calls == [], "two empty payloads reached the judge"


@pytest.mark.parametrize("reason", ["no_agent_reply", "model_error", "brief_too_large"])
@pytest.mark.parametrize("reference", [[{"kind": "ask_human"}], []])
def test_any_abstain_scores_zero_naming_the_reason(monkeypatch, reason, reference):
    judge = install_judge(monkeypatch, JudgeRecorder(0.9))
    prediction = candidate(abstain={"reason": reason, "detail": "made-up detail"})
    value, feedback = score_of(ref_example(reference), prediction)
    assert value == pytest.approx(0.0), f"an abstain ({reason}) scored {value}"
    assert reason in feedback, f"the note names no abstain reason: {feedback}"
    assert judge.calls == [], "an abstain reached the judge"


def test_raw_interpretation_abstain_scores_zero_naming_the_reason(monkeypatch):
    judge = install_judge(monkeypatch, JudgeRecorder(0.9))
    value, feedback = score_of(ref_example([ask_step()]), made_interp(abstain="no_agent_reply"))
    assert value == pytest.approx(0.0), f"an abstained Interpretation scored {value}"
    assert "no_agent_reply" in feedback, f"the note names no abstain reason: {feedback}"
    assert judge.calls == [], "an abstain reached the judge"


# ---- Item 3: no judge model, no legacy fallback, no reference -------------------


def test_stub_judge_note_scores_zero_with_the_note(monkeypatch):
    install_judge(monkeypatch, JudgeRecorder(0.0, [STUB_NOTE]))
    value, feedback = score_of(ref_example([reply_step()]), candidate([reply_step()]))
    assert value == pytest.approx(0.0), f"a stub judge note scored {value}"
    assert STUB_NOTE in feedback, f"the stub note is missing: {feedback}"


def test_unreachable_judge_model_scores_zero_with_the_stub_note(monkeypatch):
    api = require("priority.evaluation.judge")

    def no_model():
        raise RuntimeError("no judge model in the made-up world")

    monkeypatch.setattr(api, "_default_lm", no_model)
    with dspy.context(lm=None):
        value, feedback = score_of(ref_example([reply_step()]), candidate([reply_step()]))
    assert value == pytest.approx(0.0), f"an unreachable judge scored {value}"
    assert STUB_NOTE in feedback, f"the stub note is missing: {feedback}"


@pytest.mark.parametrize("shape", ["dict", "attribute"])
def test_example_with_no_reference_payload_raises(monkeypatch, shape):
    install_judge(monkeypatch, JudgeRecorder(0.9))
    example = {key: value for key, value in ref_example([]).items() if key != "expected_payloads"}
    if shape == "attribute":
        from types import SimpleNamespace
        example = SimpleNamespace(**example)
    with pytest.raises(ValueError):
        score_of(example, candidate([reply_step()]))
