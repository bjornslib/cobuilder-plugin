"""Slice 16 RED: the metric scores a stop against its label.

Each test fails until `priority.evaluation.metric` exists with `score`.
The contract pins the slice 16 weights: facts 0.4 (each of the five fields
counts the same), step kinds 0.4 (the first step 0.2, the whole ordered
list 0.2), grounding 0.1 (every quote is in the brief), validity 0.1 (no
Abstain from a model fault). `score` follows the five-argument GEPA call:
`score(example, prediction, trace=None, pred_name=None, pred_trace=None)`
and returns a `(score, feedback)` pair where the feedback names the wrong
field or step. All labels, briefs, and predictions here are made up.
"""
from __future__ import annotations

import pytest

from eval_support import (BRIEF_TEXT, EACH_FACT_SHARE, FACT_FIELDS,
                          FIRST_STEP_SHARE, GROUNDING_SHARE, QUOTE_IN_BRIEF,
                          QUOTE_NOT_IN_BRIEF, STEP_LIST_SHARE, VALIDITY_SHARE,
                          WRONG_FACTS, as_namespace, make_example,
                          make_label, make_prediction, score_of)


def base_pair(**overrides):
    """A matching example and prediction for the made-up stop 1."""
    label = make_label(1)
    return make_example(label), make_prediction(label, **overrides)


def test_perfect_prediction_scores_one():
    example, prediction = base_pair()
    value, _ = score_of(example, prediction)
    assert value == pytest.approx(1.0)


@pytest.mark.parametrize("field", FACT_FIELDS)
def test_each_wrong_fact_field_loses_exactly_its_share(field):
    example, prediction = base_pair(**{field: WRONG_FACTS[field]})
    value, feedback = score_of(example, prediction)
    assert value == pytest.approx(1.0 - EACH_FACT_SHARE)
    assert field in feedback


def test_two_wrong_fact_fields_lose_two_shares():
    example, prediction = base_pair(status="done", risk="high")
    value, _ = score_of(example, prediction)
    assert value == pytest.approx(1.0 - 2 * EACH_FACT_SHARE)


def test_wrong_first_step_loses_first_step_share():
    example, prediction = base_pair(steps=["continue"])
    value, feedback = score_of(example, prediction)
    assert value == pytest.approx(1.0 - FIRST_STEP_SHARE)
    assert "continue" in feedback


def test_right_first_step_with_wrong_tail_loses_list_share():
    label = make_label(5)  # steps ["snooze", "continue"]
    example = make_example(label)
    prediction = make_prediction(label, steps=["snooze", "reply"])
    value, _ = score_of(example, prediction)
    assert value == pytest.approx(1.0 - STEP_LIST_SHARE)


def test_accepted_alternative_in_a_list_position_counts_as_right():
    label = make_label(4)  # steps [["reply", "ask_human"]]
    example = make_example(label)
    prediction = make_prediction(label, steps=["ask_human"])
    value, _ = score_of(example, prediction)
    assert value == pytest.approx(1.0)


def test_accepted_alternative_in_second_position_counts_as_right():
    label = make_label(1, steps=["ask_human", ["reply", "continue"]])
    example = make_example(label)
    prediction = make_prediction(label, steps=["ask_human", "continue"])
    value, _ = score_of(example, prediction)
    assert value == pytest.approx(1.0)


def test_quote_not_in_brief_loses_grounding_share():
    example, prediction = base_pair(quotes=[QUOTE_NOT_IN_BRIEF])
    value, feedback = score_of(example, prediction)
    assert value == pytest.approx(1.0 - GROUNDING_SHARE)
    assert "quot" in feedback.lower() or "ground" in feedback.lower()


def test_empty_quotes_keep_the_grounding_share():
    label = make_label(1, steps=[])
    example = make_example(label, brief_text=BRIEF_TEXT)
    prediction = make_prediction(label, steps=[], quotes=[])
    value, _ = score_of(example, prediction)
    assert value == pytest.approx(1.0)


def test_model_fault_abstain_loses_validity_share():
    example, prediction = base_pair(abstain={"reason": "model_error"})
    value, feedback = score_of(example, prediction)
    assert value == pytest.approx(1.0 - VALIDITY_SHARE)
    assert "model_error" in feedback or "validity" in feedback.lower()


def test_gepa_five_arg_call_returns_score_and_feedback():
    example, prediction = base_pair()
    result = score_of(example, prediction, None, "stop", None)
    assert isinstance(result, tuple) and len(result) == 2
    value, feedback = result
    assert value == pytest.approx(1.0)
    assert isinstance(feedback, str)


def test_gepa_five_arg_call_still_names_the_wrong_field():
    example, prediction = base_pair(status="done")
    value, feedback = score_of(example, prediction, None, "stop", None)
    assert value == pytest.approx(1.0 - EACH_FACT_SHARE)
    assert "status" in feedback


def test_feedback_names_the_wrong_field_and_the_wrong_step():
    example, prediction = base_pair(status="done", steps=["continue"])
    _, feedback = score_of(example, prediction)
    assert "status" in feedback
    assert "continue" in feedback


def test_attribute_style_inputs_score_the_same():
    example, prediction = base_pair()
    value, _ = score_of(as_namespace(example), as_namespace(prediction))
    assert value == pytest.approx(1.0)


def test_steps_missing_on_the_prediction_side_lose_both_step_shares():
    label = make_label(1, steps=[])
    example = make_example(label)
    prediction = make_prediction(label, steps=["reply"], quotes=[])
    value, _ = score_of(example, prediction)
    assert value == pytest.approx(1.0 - FIRST_STEP_SHARE - STEP_LIST_SHARE)


def test_quote_in_brief_keeps_the_grounding_share():
    example, prediction = base_pair(quotes=[QUOTE_IN_BRIEF])
    value, _ = score_of(example, prediction)
    assert value == pytest.approx(1.0)
