"""Slice 19 RED: the label-free gate fails each fault with a named 0-score note.

Each test runs the interpreter on made-up replies with no label present,
then scores the abstained stop. The contract: every fault abstains, the
score is 0.00, and the feedback names the failed check. The check names
below come from the slice brief: unparsable output, bad enum, disallowed
kind, out-of-range step count, and empty questions list.
"""
from __future__ import annotations

import json

import pytest

from eval_support import make_example, score_of
from fixtures_support import make_label, require
from interpret_support import QUOTE_1, dummy, fill, interpret, no_live_call, pick, triage  # noqa: F401

# The no_live_call import stays: it blocks any test from reaching the real key.


def gate_score(out):
    """Score one abstained stop against the made-up ask_human label and reference."""
    runner = require("priority.evaluation.runner")
    example = make_example(make_label(1)) | {"expected_payloads": [{"kind": "ask_human"}]}
    return score_of(example, runner.to_prediction(out))


def test_unparsable_output_abstains_with_zero_and_names_the_parse_check():
    replies = [triage(), pick(("reply", QUOTE_1)), {"payload": "this is not JSON"}]
    out = interpret(dummy(replies))
    assert out.abstained is not None, "the gate passed unparsable output"
    value, feedback = gate_score(out)
    assert value == pytest.approx(0.0), f"a gate fault scored {value}, want 0.00"
    assert "unparsable" in feedback.lower(), f"feedback names no parse check: {feedback}"


def test_bad_enum_abstains_with_zero_and_names_the_enum_check():
    replies = [triage(), pick(("dismiss", QUOTE_1)), fill(reason="bogus")]
    out = interpret(dummy(replies))
    assert out.abstained is not None, "the gate passed an out-of-range enum value"
    value, feedback = gate_score(out)
    assert value == pytest.approx(0.0), f"a gate fault scored {value}, want 0.00"
    assert "enum" in feedback.lower(), f"feedback names no enum check: {feedback}"


def test_disallowed_kind_abstains_with_zero_and_names_the_kind_check():
    replies = [triage(), pick(("launch_missile", QUOTE_1))]
    out = interpret(dummy(replies))
    assert out.abstained is not None, "the gate passed a disallowed kind"
    value, feedback = gate_score(out)
    assert value == pytest.approx(0.0), f"a gate fault scored {value}, want 0.00"
    assert "disallowed" in feedback.lower(), f"feedback names no kind check: {feedback}"


def test_empty_step_list_abstains_with_zero_and_names_the_step_count_check():
    replies = [triage(), {"steps": json.dumps([])}]
    out = interpret(dummy(replies))
    assert out.abstained is not None, "the gate passed an out-of-range step count"
    value, feedback = gate_score(out)
    assert value == pytest.approx(0.0), f"a gate fault scored {value}, want 0.00"
    assert "step count" in feedback.lower(), f"feedback names no step count check: {feedback}"


def test_empty_questions_list_abstains_with_zero_and_names_the_questions_check():
    replies = [triage(), pick(("ask_human", QUOTE_1)),
               fill(detail={"role": "decide", "questions": []},
                    why_escalated="A human owns the cost.")]
    out = interpret(dummy(replies))
    assert out.abstained is not None, "the gate passed an empty questions list"
    value, feedback = gate_score(out)
    assert value == pytest.approx(0.0), f"a gate fault scored {value}, want 0.00"
    assert "questions" in feedback.lower(), f"feedback names no questions check: {feedback}"
