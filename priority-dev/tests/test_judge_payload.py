"""Slice 19: Decide holds the questions list, and the judge module grades a payload.

The contract: Decide carries `questions: tuple[Question, ...]` with at
least one item and no empty default. The judge module takes the brief text
plus the raw predicted payload plus the expected payload and returns the
final score in 0..1 with one note per part. The eval report keeps one score
line for each stop, with the payload score. No test makes a model call: the
judge tests run on a DummyLM, and the eval test stubs the judge and the
program. Since slice 21 the metric tests are in test_propose_metric.py.
"""
from __future__ import annotations

import contextlib
import io

import pytest

from eval_support import StubInterpreter, require, stub_predictions_for, write_eval_world
from interpret_support import CARD, DummyLM, dspy, no_live_call  # noqa: F401

BRIEF_TEXT = "The blue widget trial ended in the north shed. Only the human can pick the paint colour."
Q2 = {"ask": "Who pays for the extra run?",
      "options": [{"label": "team budget"}],
      "agent_recommendation": "team budget"}
JUDGE_NOTES = ["decide: the questions match the label."]


def questions_field():
    """The Decide questions field, or an assertion failure on the old schema."""
    models = require("priority.interpreter.models")
    assert "questions" in models.Decide.model_fields, \
        "Decide holds a single .question, not a questions list"
    return models.Decide.model_fields["questions"]


def judge_api():
    """The judge module, or an assertion failure while it does not exist yet."""
    import importlib.util
    assert importlib.util.find_spec("priority.evaluation.judge") is not None, \
        "the judge module is missing: priority/evaluation/judge.py"
    return require("priority.evaluation.judge")


@contextlib.contextmanager
def fixed_model(replies):
    """Run one block with the model stubbed to fixed replies, then restore it."""
    assert dspy is not None, "dspy is missing: run the tests in the priority-dev project"
    previous = dspy.settings.lm
    language = DummyLM(replies)
    dspy.settings.configure(lm=language)
    try:
        yield language
    finally:
        dspy.settings.configure(lm=previous)


def recording_stub(calls, score, notes):
    """A stub judge that records its inputs and returns a fixed score."""
    def run(brief_text, predicted, expected):
        calls.append({"brief_text": brief_text, "predicted": predicted,
                      "expected": expected})
        return (score, list(notes))
    return run


# ---- Decide holds the questions list ----------------------------------------


def test_decide_holds_a_questions_list_not_a_single_question():
    models = require("priority.interpreter.models")
    assert "questions" in models.Decide.model_fields, \
        "Decide holds a single .question, not a questions list"
    assert "question" not in models.Decide.model_fields, \
        "Decide still holds a single .question next to the list"


def test_questions_require_at_least_one_item_with_no_empty_default():
    field = questions_field()
    assert field.is_required(), "questions has an empty default"
    assert any(getattr(item, "min_length", 0) >= 1 for item in field.metadata), \
        "questions allows an empty list"


def test_multi_question_payload_parses_into_a_tuple():
    models = require("priority.interpreter.models")
    assert "questions" in models.Decide.model_fields, \
        "Decide holds a single .question, not a questions list"
    decided = models.Decide.model_validate({"role": "decide",
                                            "questions": [CARD, Q2]})
    assert isinstance(decided.questions, tuple), "questions is not a tuple"
    assert [item.ask for item in decided.questions] == [CARD["ask"], Q2["ask"]]


# ---- The judge module ---------------------------------------------------------


def test_judge_module_exposes_a_judge_callable():
    api = judge_api()
    assert callable(getattr(api, "judge", None)), "judge.judge is not callable"


def test_judge_returns_a_final_score_with_one_note_per_part():
    api = judge_api()
    predicted = {"detail": {"role": "decide", "questions": [CARD, Q2]},
                 "why_escalated": "A human owns the cost."}
    expected = {"detail": {"role": "decide", "questions": [CARD, Q2]},
                "why_escalated": "A human owns the cost."}
    with fixed_model([{"score": 0.6, "notes": JUDGE_NOTES}]):
        score, notes = api.judge(BRIEF_TEXT, predicted, expected)
    assert score == pytest.approx(0.6), f"the judge did not return the fixed score: {score}"
    assert len(notes) == 1, f"the judge returned {len(notes)} notes for one part, want 1"


def test_judge_sends_the_raw_payloads_to_the_model():
    api = judge_api()
    predicted = {"detail": {"role": "decide", "questions": [CARD, Q2]},
                 "why_escalated": "A human owns the cost."}
    expected = {"detail": {"role": "decide", "questions": [CARD]},
                "why_escalated": "A human owns the cost."}
    with fixed_model([{"score": 0.6, "notes": JUDGE_NOTES}]) as language:
        api.judge(BRIEF_TEXT, predicted, expected)
    blob = "\n".join(entry["messages"][-1]["content"] for entry in language.history)
    assert "Who pays for the extra run?" in blob, \
        "the nested predicted questions never reached the model"
    assert "Retry with a fixed delay or with backoff?" in blob, "the expected payload never reached the model"


def test_judge_rubric_compares_closed_fields_exactly():
    api = judge_api()
    predicted = {"detail": {"role": "decide", "questions": [CARD]},
                 "why_escalated": "A human owns the cost."}
    expected = {"detail": {"role": "decide", "questions": [CARD]},
                "why_escalated": "A human owns the cost."}
    with fixed_model([{"score": 0.6, "notes": JUDGE_NOTES}]) as language:
        api.judge(BRIEF_TEXT, predicted, expected)
    blob = "\n".join(entry["messages"][-1]["content"] for entry in language.history)
    assert "exact" in blob.lower(), "the judge rubric never asks for an exact closed-field compare"


# ---- Per-stop lines carry the payload score ------------------------------------


def run_eval_with_stub(monkeypatch, tmp_path, split_name):
    """Run `priority eval` in process with a stub program. Return exit code and output."""
    interpreter = require("priority.interpreter")
    config = require("priority.config")
    manifest_path, labels_path, real_dir, parts = write_eval_world(tmp_path)
    monkeypatch.setattr(config, "load_key",
                        lambda *args, **kwargs: (_ for _ in ()).throw(
                            AssertionError("a test reached for the real key")))
    monkeypatch.setattr(interpreter, "Interpreter",
                        lambda *args, **kwargs: StubInterpreter(
                            stub_predictions_for(manifest_path, labels_path)))
    from priority.cli import main

    code = None
    out = io.StringIO()
    with contextlib.redirect_stdout(out):
        code = main(["eval", "--split", split_name,
                     "--manifest", str(manifest_path),
                     "--labels", str(labels_path),
                     "--real-dir", str(real_dir)])
    return code, out.getvalue(), parts


def test_eval_per_stop_lines_carry_the_payload_score(monkeypatch, tmp_path):
    api = judge_api()
    monkeypatch.setattr(api, "judge", recording_stub([], 0.8, ["payload: the questions match."]))
    code, printed, parts = run_eval_with_stub(monkeypatch, tmp_path, "train")
    assert code == 0, f"eval failed: {printed[-500:]}"
    stop_lines = [line for line in printed.splitlines() if line.startswith("score stop ")]
    assert stop_lines, "the report prints no per-stop score lines"
    assert all("payload=" in line for line in stop_lines), \
        "per-stop lines carry no payload score"
    session_lines = [line for line in printed.splitlines() if line.startswith("session ")]
    assert session_lines, "the report lost its per-session aggregation lines"
    assert all("overall" in line for line in session_lines), \
        "the per-session aggregation lines changed shape"
    assert {line.split()[1] for line in session_lines} == set(parts["train"])
