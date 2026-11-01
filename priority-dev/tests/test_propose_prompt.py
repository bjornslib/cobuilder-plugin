"""The ProposeStop prompt contract (RED role). No test makes a live model call.

The live arms showed three prompt-driven parse faults: the model wrote
`why_escalated` inside `detail.decide`, wrote `role` inside each question, and
wrote `ask` over 300 characters or an option `label` over 120 characters.

1. The rendered field-structure text carries the docstring, and the docstring
   tells the model where each field belongs and how long the strings may be.
2. The rendered schema holds maxLength 300 for ask and 120 for label, and the
   docstring repeats those numbers.
3. A reply with `why_escalated` inside `detail` still abstains invalid_output,
   and a reply with the correct shape still validates.
"""
from __future__ import annotations

import pytest

from interpret_support import CARD, dspy, dummy, predicted, propose, step  # noqa: F401  (no_live_call is autouse)
from priority.interpreter.signatures import ProposeStop
def prompt_text() -> str:
    """The system message of one ProposeStop call: the docstring plus the field structure."""
    messages = dspy.ChatAdapter().format(ProposeStop, inputs={"brief_text": "BRIEF"}, demos=[])
    system = [m for m in messages if m["role"] == "system"]
    assert system, "the adapter produced no system message"
    return system[0]["content"]


def field_structure() -> str:
    """The adapter's field-structure text for ProposeStop, as the model sees it in the system message."""
    return dspy.ChatAdapter().format_field_structure(ProposeStop)


def docstring() -> str:
    """The signature docstring that the adapter renders into the prompt."""
    return ProposeStop.__doc__ or ""


# ---- 1. The docstring tells the model where each field belongs ---------------


def test_the_rendered_text_carries_the_docstring():
    rendered = prompt_text()
    missing = [line for line in docstring().splitlines() if line.strip() and line.strip() not in rendered]
    assert not missing, f"the adapter does not render these docstring lines into the prompt: {missing}"


def test_the_docstring_places_why_escalated_on_the_step_not_inside_detail():
    text = docstring().lower()
    assert "why_escalated" in text, "the docstring never names why_escalated"
    assert "detail" in text
    # why_escalated belongs on the step, next to kind and detail, never inside detail
    assert "never inside" in text and "detail" in text.split("never inside", 1)[1], (
        "the docstring does not say that why_escalated never goes inside detail")
    assert "kind" in text, "the docstring does not name kind as the sibling of why_escalated"


def test_the_docstring_places_role_on_detail_only_not_inside_a_question():
    text = docstring().lower()
    assert "role" in text, "the docstring never names role"
    assert "question" in text, "the docstring never names the question"
    assert "never inside" in text, "the docstring does not forbid role inside a question"
    after = text.split("never inside", 1)[1]
    assert "question" in after, "the docstring does not say that role never goes inside a question"


def test_the_docstring_caps_ask_at_300_characters():
    assert "300" in docstring(), "the docstring does not repeat the 300-character cap of ask"
    assert "ask" in docstring().lower(), "the docstring does not name ask"


def test_the_docstring_caps_each_option_label_at_120_characters():
    assert "120" in docstring(), "the docstring does not repeat the 120-character cap of an option label"
    assert "label" in docstring().lower(), "the docstring does not name the option label"


def test_the_docstring_tells_the_model_to_trim_instead_of_exceeding():
    text = docstring().lower()
    assert "trim" in text or "rephrase" in text or "shorten" in text, (
        "the docstring does not tell the model to trim or rephrase instead of exceeding the caps")


# ---- 2. The schema caps and the docstring repeats them -----------------------


def test_the_schema_caps_ask_at_300_and_each_label_at_120():
    text = field_structure()
    assert '"maxLength": 300' in text, "the rendered schema has no maxLength 300"
    assert '"maxLength": 120' in text, "the rendered schema has no maxLength 120"
    question = text[text.index('"Question"'):]
    assert '"maxLength": 300' in question[:question.index('"title": "Question"')], (
        "the maxLength 300 does not belong to the ask field of a question")
    option = text[text.index('"Option"'):]
    assert '"maxLength": 120' in option[:option.index('"title": "Option"')], (
        "the maxLength 120 does not belong to the label field of an option")


def test_the_docstring_repeats_the_schema_numbers():
    doc = docstring()
    assert "300" in doc and "120" in doc, "the docstring does not repeat the 300 and 120 caps"


# ---- 3. The gate keeps its behaviour -----------------------------------------


def test_why_escalated_inside_detail_still_abstains_invalid_output():
    wrong = step("ask_human", detail={"role": "decide", "why_escalated": "A human owns the cost.",
                                       "questions": [CARD]})
    out = predicted(dummy([propose([wrong])]))
    assert out.abstain is not None, "a why_escalated inside detail passed the gate"
    assert out.abstain["reason"] == "invalid_output"
    assert out.steps == []


def test_the_correct_shape_still_validates():
    right = step("ask_human")
    out = predicted(dummy([propose([right])]))
    assert out.abstain is None, f"a correct reply abstained: {out.abstain}"
    item = out.steps[0]
    assert item["kind"] == "ask_human"
    assert item["why_escalated"] == "A human owns the cost."
    assert item["detail"]["role"] == "decide"
    assert item["detail"]["questions"][0]["ask"] == CARD["ask"]
