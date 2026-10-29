"""The legacy facts-and-steps parts of a stop, kept as report diagnostics.

Slice 20 made the judge payload score the only score: `metric.score` no
longer returns the legacy number. `metric.components` still reports the
legacy parts for the eval report. The weights stay pinned: facts 0.5 (each
of the five fields 0.10), step kinds 0.4 (the first step 0.2, the whole
ordered list 0.2), validity 0.1 (no Abstain from a model fault). Quotes are
not scored. All labels, briefs, and predictions here are made up.
"""
from __future__ import annotations

import pytest
from eval_support import (BRIEF_TEXT, EACH_FACT_SHARE, FACT_FIELDS,
                          FIRST_STEP_SHARE, QUOTE_IN_BRIEF,
                          QUOTE_NOT_IN_BRIEF, STEP_LIST_SHARE, VALIDITY_SHARE,
                          WRONG_FACTS, as_namespace, make_example,
                          make_label, make_prediction, metric_api)


def parts_of(example, prediction) -> dict:
    """The legacy diagnostic parts of one stop."""
    return metric_api().components(example, prediction)


def base_pair(**overrides):
    """A matching example and prediction for the made-up stop 1."""
    label = make_label(1)
    return make_example(label), make_prediction(label, **overrides)


def test_perfect_prediction_scores_one():
    assert parts_of(*base_pair())["overall"] == pytest.approx(1.0)


@pytest.mark.parametrize("field", FACT_FIELDS)
def test_each_wrong_fact_field_loses_exactly_its_share(field):
    parts = parts_of(*base_pair(**{field: WRONG_FACTS[field]}))
    assert parts["overall"] == pytest.approx(1.0 - EACH_FACT_SHARE)
    assert parts["fact_ok"][field] is False


def test_two_wrong_fact_fields_lose_two_shares():
    parts = parts_of(*base_pair(status="done", risk="high"))
    assert parts["overall"] == pytest.approx(1.0 - 2 * EACH_FACT_SHARE)


def test_wrong_first_step_loses_first_step_share():
    parts = parts_of(*base_pair(steps=["continue"]))
    assert parts["overall"] == pytest.approx(1.0 - FIRST_STEP_SHARE)
    assert parts["first_step"] == pytest.approx(0.0)


def test_right_first_step_with_wrong_tail_loses_list_share():
    label = make_label(5)  # steps ["snooze", "continue"]
    parts = parts_of(make_example(label), make_prediction(label, steps=["snooze", "reply"]))
    assert parts["overall"] == pytest.approx(1.0 - STEP_LIST_SHARE)


def test_accepted_alternative_in_a_list_position_counts_as_right():
    label = make_label(4)  # steps [["reply", "ask_human"]]
    parts = parts_of(make_example(label), make_prediction(label, steps=["ask_human"]))
    assert parts["overall"] == pytest.approx(1.0)


def test_accepted_alternative_in_second_position_counts_as_right():
    label = make_label(1, steps=["ask_human", ["reply", "continue"]])
    parts = parts_of(make_example(label), make_prediction(label, steps=["ask_human", "continue"]))
    assert parts["overall"] == pytest.approx(1.0)


def test_paraphrased_quote_scores_same_as_exact_quote():
    exact = parts_of(*base_pair(quotes=[QUOTE_IN_BRIEF]))["overall"]
    paraphrased = parts_of(*base_pair(quotes=[QUOTE_NOT_IN_BRIEF]))["overall"]
    assert paraphrased == pytest.approx(exact)


def test_each_fact_field_is_worth_one_tenth():
    assert EACH_FACT_SHARE == pytest.approx(0.10)


def test_quotes_do_not_change_the_score():
    label = make_label(1, steps=[])
    example = make_example(label, brief_text=BRIEF_TEXT)
    parts = parts_of(example, make_prediction(label, steps=[], quotes=[]))
    assert parts["overall"] == pytest.approx(1.0)


def test_model_fault_abstain_loses_validity_share():
    parts = parts_of(*base_pair(abstain={"reason": "model_error"}))
    assert parts["overall"] == pytest.approx(1.0 - VALIDITY_SHARE)
    assert parts["validity"] == pytest.approx(0.0)


def test_attribute_style_inputs_score_the_same():
    example, prediction = base_pair()
    assert parts_of(as_namespace(example), as_namespace(prediction))["overall"] == pytest.approx(1.0)


def test_steps_missing_on_the_prediction_side_lose_both_step_shares():
    label = make_label(1, steps=[])
    parts = parts_of(make_example(label), make_prediction(label, steps=["reply"], quotes=[]))
    assert parts["overall"] == pytest.approx(1.0 - FIRST_STEP_SHARE - STEP_LIST_SHARE)


def test_exact_quote_keeps_the_perfect_score():
    assert parts_of(*base_pair(quotes=[QUOTE_IN_BRIEF]))["overall"] == pytest.approx(1.0)
