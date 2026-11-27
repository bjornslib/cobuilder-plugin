"""Slice 21, one typed call (RED role). The contract is in interpret_support.py. Every test uses DummyLM.

1. The ProposeStop signature
2. The Interpreter: one predictor, one call, one Prediction
3. The only gate: the adapter parse plus pydantic validation

The removed chain is in test_chain_removed.py, and the command is in test_interpret_cli.py.
"""
from __future__ import annotations

import hashlib
import logging
from typing import Annotated, get_args

import pytest
from pydantic import TypeAdapter, ValidationError

from brief_support import require
from interpret_support import (CARD, CODE_FIELDS, KINDS, SESSION_ID, STATUSES, FailingLM, RateLimited, dspy,
                               dummy, interpreter_api, log_reasons, make_brief, no_live_call, predicted,  # noqa: F401
                               propose, read_calls, step)

# ---- 1. The ProposeStop signature --------------------------------------------


def propose_signature():
    signatures = require("priority.interpreter.signatures")
    assert hasattr(signatures, "ProposeStop"), "signatures.py has no ProposeStop"
    return signatures.ProposeStop


def steps_adapter() -> TypeAdapter:
    """The steps output type with its field constraints, as pydantic validates it."""
    field = propose_signature().output_fields["steps"]
    return TypeAdapter(Annotated[(field.annotation, *field.metadata)] if field.metadata else field.annotation)


def validated(steps: list) -> list:
    """The steps after validation, as a plain list. A root model holds them in `root`."""
    value = steps_adapter().validate_python(steps)
    return list(getattr(value, "root", value))


def test_propose_stop_reads_the_brief_text_only():
    fields = propose_signature().input_fields
    assert set(fields) == {"brief_text"}
    assert fields["brief_text"].annotation is str


def test_propose_stop_writes_status_needs_human_steps_and_priority_and_no_card():
    outputs = propose_signature().output_fields
    assert set(outputs) == {"status", "needs_human", "steps", "priority"}
    assert set(get_args(outputs["status"].annotation)) == set(STATUSES)
    assert outputs["needs_human"].annotation is bool
    assert set(get_args(outputs["priority"].annotation)) == {"P1", "P2", "P3"}


@pytest.mark.parametrize("kind", KINDS)
def test_each_of_the_13_kinds_validates_as_a_step(kind):
    [item] = validated([step(kind)])
    assert getattr(item, "kind", None) == kind


@pytest.mark.parametrize("bad", [step("set_priority_hint", hint=0.5), {"kind": "launch_missile"}])
def test_a_kind_outside_the_13_is_not_a_step(bad):
    with pytest.raises(ValidationError):
        validated([bad])


def test_the_step_list_holds_0_to_3_steps():
    assert validated([]) == []
    assert len(validated([step("reply")] * 3)) == 3
    with pytest.raises(ValidationError):
        validated([step("reply")] * 4)


def walk(node):
    """Each dict inside a JSON schema."""
    if isinstance(node, dict):
        yield node
        for value in node.values():
            yield from walk(value)
    elif isinstance(node, list):
        for value in node:
            yield from walk(value)


def test_the_steps_are_discriminated_on_kind():
    schema = steps_adapter().json_schema()
    names = {node["discriminator"].get("propertyName") for node in walk(schema)
             if isinstance(node.get("discriminator"), dict)}
    assert "kind" in names, f"the steps schema has no discriminator on kind: {names}"


def test_no_step_schema_holds_a_code_set_field():
    schema = steps_adapter().json_schema()
    found = {name for node in walk(schema) if isinstance(node.get("properties"), dict)
             for name in node["properties"]}
    assert not found & set(CODE_FIELDS), f"a step schema holds {sorted(found & set(CODE_FIELDS))}"


def test_set_priority_hint_is_not_an_action_kind():
    kinds = tuple(getattr(interpreter_api(), "ACTION_KINDS", ()))
    assert "set_priority_hint" not in kinds
    assert set(kinds) == set(KINDS)


# ---- 2. The Interpreter: one predictor, one call, one Prediction --------------


def test_the_interpreter_holds_one_predictor_named_propose():
    program = interpreter_api().Interpreter(lm=None)
    assert issubclass(interpreter_api().Interpreter, dspy.Module)
    assert [name for name, _ in program.named_predictors()] == ["propose"]


def test_forward_makes_one_call_and_returns_the_prediction_fields():
    lm = dummy([propose([step("reply"), step("ask_human")], priority="P1")])
    out = predicted(lm, session_id=SESSION_ID)
    assert len(lm.history) == 1
    assert out.abstain is None
    assert (out.status, out.needs_human, out.priority) == ("waiting_answer", True, "P1")
    assert [item["kind"] for item in out.steps] == ["reply", "ask_human"]
    assert out.steps[0]["text"] == "fixed"
    assert out.steps[1]["detail"]["questions"][0]["ask"] == CARD["ask"]


def test_code_sets_the_session_and_the_author_of_each_step():
    out = predicted(dummy([propose([step("reply"), step("continue")])]), session_id=SESSION_ID)
    assert out.abstain is None
    for item in out.steps:
        assert isinstance(item, dict), f"a step is not a dict: {item!r}"
        assert (item["session_id"], item["author"]) == (SESSION_ID, "interpreter")
        assert "confidence" not in item and "evidence_quote" not in item


def test_the_model_cannot_forge_the_author_or_the_session():
    out = predicted(dummy([propose([step("reply", author="human", session_id="forged")])]), session_id=SESSION_ID)
    if out.abstain is None:
        assert all(item["author"] == "interpreter" and item["session_id"] == SESSION_ID for item in out.steps)
    else:
        assert out.abstain["reason"] == "invalid_output"


def test_zero_steps_are_valid_and_give_no_abstain():
    out = predicted(dummy([propose([], status="continuing", needs_human=False, priority="P3")]))
    assert out.abstain is None
    assert (out.steps, out.status, out.priority) == ([], "continuing", "P3")


def test_a_multi_question_ask_human_step_parses():
    second = {"ask": "Who pays for the extra run?", "options": [{"label": "team budget"}]}
    out = predicted(dummy([propose([step("ask_human", detail={"role": "decide", "questions": [CARD, second]})])]))
    assert out.abstain is None
    assert [item["ask"] for item in out.steps[0]["detail"]["questions"]] == [CARD["ask"], second["ask"]]


def test_the_call_log_keeps_one_row_per_call(tmp_path):
    lm = dummy([propose([step("reply")]), propose([])])
    brief = make_brief()
    predicted(lm, brief, log_dir=tmp_path)
    predicted(lm, brief, log_dir=tmp_path)
    rows = read_calls(tmp_path)
    assert len(rows) == 2
    for row in rows:
        assert row["model_id"] == lm.model and row["raw_reply"]
        assert brief.for_model() in row["rendered_input"]
        assert row["prompt_hash"] == hashlib.sha256(row["rendered_input"].encode()).hexdigest()


# ---- 3. The only gate ---------------------------------------------------------

FOUR = [step("reply", text=f"answer {word}") for word in ("alpha", "bravo", "charlie", "delta")]
FAULTS = {
    "unparsable reply": (propose(steps="this is not JSON"), "steps", "this is not JSON"),
    "unknown kind": (propose([{"kind": "launch_missile"}]), "launch_missile", "launch_missile"),
    "ask_human with no detail": (propose([{"kind": "ask_human", "why_escalated": "only the owner knows"}]),
                                 "detail", "only the owner knows"),
    "four steps": (propose(FOUR), "3", "answer delta"),
    "priority outside P1 to P3": (propose([step("reply")], priority="P4"), "priority", "P4"),
}


@pytest.mark.parametrize("reply,named,marker", FAULTS.values(), ids=FAULTS.keys())
def test_a_fault_gives_invalid_output_with_the_raw_reply_and_no_steps(caplog, reply, named, marker):
    caplog.set_level(logging.INFO)
    lm = dummy([reply])
    out = predicted(lm)
    assert out.abstain is not None, "the gate passed a faulty reply"
    assert set(out.abstain) == {"reason", "detail", "raw"}
    assert out.abstain["reason"] == "invalid_output"
    assert named in out.abstain["detail"], f"the detail does not name the fault: {out.abstain['detail']!r}"
    assert marker in out.abstain["raw"], "the abstain does not hold the reply text of the model"
    assert out.steps == []
    assert len(lm.history) == 1, "a faulty reply led to a second model call"
    assert "invalid_output" in log_reasons(caplog)


ERRORS = {"rate limit": RateLimited("429 Too Many Requests"), "timeout": TimeoutError("the model timed out")}


@pytest.mark.parametrize("error", ERRORS.values(), ids=ERRORS.keys())
def test_a_model_call_that_raises_gives_model_error(tmp_path, error):
    out = predicted(FailingLM([propose()], error, fail_at=1), log_dir=tmp_path)
    assert set(out.abstain) == {"reason", "detail", "raw"}
    assert out.abstain["reason"] == "model_error"
    assert str(error) in out.abstain["detail"]
    assert out.steps == []
    [row] = read_calls(tmp_path)
    assert str(error) in row["error"]

