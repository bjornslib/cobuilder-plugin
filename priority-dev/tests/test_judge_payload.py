"""Slice 19 RED: Decide holds the questions list and the judge scores the payload.

The contract: Decide carries `questions: tuple[Question, ...]` with at
least one item and no empty default, and a multi-question payload parses
and flows through pick, fill, and card. Readers use the list, never a
single `.question`. The judge module takes the brief text plus the raw
predicted payloads plus the expected payloads and returns the final score
in 0..1 with one note per part. The metric only clamps that score and the
feedback wraps it as a dspy Prediction. No test makes a model call: the
judge tests run on a DummyLM, and the metric tests stub the judge.
"""
from __future__ import annotations

import contextlib
import io

import pytest

from eval_support import BRIEF_TEXT, FACT_FIELDS, make_example, make_prediction, require, score_of
from eval_support import stub_predictions_for, write_eval_world
from fixtures_support import make_label
from interpret_support import (CARD, QUOTE_1, DummyLM, card, dspy, dummy, fill, interpret,
                               no_live_call, pick, stages, triage)  # noqa: F401
from judge_ref_support import stripped


Q2 = {"ask": "Who pays for the extra run?",
      "options": [{"label": "team budget"}],
      "agent_recommendation": "team budget"}

EXPECTED_PAYLOADS = {"ask_human": {"questions": ["Pick fixed or backoff?",
                                                 "Who pays for the extra run?"]}}
MATCHED_PAYLOADS = {"ask_human": {"questions": ["Pick fixed or backoff?",
                                                "Who pays for the extra run?"]}}


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


def payload_pair(pred_payloads=MATCHED_PAYLOADS):
    """One flat-dict metric input carrying payloads. The metric keeps dict support."""
    example = make_example(make_label(1)) | {"brief_text": BRIEF_TEXT,
                                             "expected_payloads": EXPECTED_PAYLOADS}
    prediction = make_prediction(make_label(1)) | {"payloads": pred_payloads}
    return example, prediction


def made_facts():
    """Facts for a quiet continuing stop, in model units."""
    models = require("priority.interpreter.models")
    signatures = require("priority.interpreter.signatures")
    return models.Facts(status="continuing", needs_human=False, answer_class="none",
                        risk=signatures.RISK["low"], priority_hint=signatures.HINT["can_wait"],
                        confidence={name: 0.9 for name in FACT_FIELDS})


def interp_pair():
    """A real Interpretation with step payloads plus its metric example.

    The judge must receive the proposal steps as produced, never a flattened
    kinds list. The flat-dict payload_pair above covers dict inputs only.
    """
    models = require("priority.interpreter.models")
    steps = [models.Reply(session_id="made-up-session", author="interpreter",
                          evidence_quote=QUOTE_1, confidence=0.9, text="Use backoff."),
             models.Dismiss(session_id="made-up-session", author="interpreter",
                            evidence_quote=QUOTE_1, confidence=0.8, reason="done")]
    proposal = models.Proposal(proposal_id="p-made-up", brief_id="b-made-up", steps=tuple(steps))
    interp = models.Interpretation(brief_id="b-made-up", facts=made_facts(),
                                   advice=models.Advice(proposal=proposal))
    expected = [step.model_dump() for step in steps]
    example = make_example(make_label(2)) | {"brief_text": BRIEF_TEXT,
                                             "expected_payloads": expected}
    return example, interp, steps


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


# ---- The multi-question payload flows through pick, fill, and card ----------


def test_multi_question_payload_flows_through_pick_fill_and_card(tmp_path):
    replies = [triage(), pick(("ask_human", QUOTE_1)),
               fill(detail={"role": "decide", "questions": [CARD, Q2]},
                    why_escalated="A human owns the cost."),
               card()]
    out = interpret(dummy(replies), log_dir=tmp_path)
    assert out.abstained is None, f"the gate abstained a two-question payload: {out.abstained}"
    (step,) = out.advice.proposal.steps
    assert [item.ask for item in step.detail.questions] == [CARD["ask"], Q2["ask"]]
    assert "card" in stages(tmp_path), "the two-question payload never reached card"


# ---- Readers use the list ----------------------------------------------------


def test_to_prediction_uses_the_questions_list():
    from interpret_support import PAYLOADS
    replies = [triage(), pick(("ask_human", QUOTE_1)),
               fill(**PAYLOADS["ask_human"]), card()]
    out = interpret(dummy(replies))
    assert out.abstained is None, f"the valid ask_human flow abstained: {out.abstained}"
    runner = require("priority.evaluation.runner")
    prediction = runner.to_prediction(out)
    got = prediction.get("questions")
    assert got is not None and len(got) == 1, \
        f"to_prediction exposes no questions list: {prediction}"
    asks = [item["ask"] if isinstance(item, dict) else item.ask for item in got]
    assert asks == [CARD["ask"]], f"the questions list lost the card ask: {got}"
    assert "question" not in prediction and "card" not in prediction, \
        f"to_prediction still exposes a single .question: {prediction}"


# ---- The judge module ---------------------------------------------------------


def test_judge_module_exposes_a_judge_callable():
    api = judge_api()
    assert callable(getattr(api, "judge", None)), "judge.judge is not callable"


JUDGE_NOTES = ["decide: the questions match the label."]


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


# ---- The metric only clamps and wraps -----------------------------------------


def test_fixed_judge_score_flows_through_as_the_final_score(monkeypatch):
    api = judge_api()
    calls = []
    monkeypatch.setattr(api, "judge", recording_stub(calls, 0.75, JUDGE_NOTES))
    value, feedback = score_of(*payload_pair())
    assert value == pytest.approx(0.75), f"the metric moved the judge score to {value}"
    assert "the questions match" in feedback, f"the judge note is missing: {feedback}"


def test_interpretation_step_payloads_flow_through_as_the_final_score(monkeypatch):
    api = judge_api()
    calls = []
    monkeypatch.setattr(api, "judge", recording_stub(calls, 0.75, JUDGE_NOTES))
    example, interp, steps = interp_pair()
    value, feedback = score_of(example, interp)
    assert value == pytest.approx(0.75), f"the metric moved the judge score to {value}"
    assert "the questions match" in feedback, f"the judge note is missing: {feedback}"
    assert calls and calls[0]["predicted"] == stripped([step.model_dump() for step in steps]), \
        "the judge never saw the proposal steps, less the code-set fields"


def test_metric_clamps_out_of_range_judge_scores(monkeypatch):
    api = judge_api()
    example, interp, _ = interp_pair()
    calls = []
    monkeypatch.setattr(api, "judge", recording_stub(calls, 1.5, JUDGE_NOTES))
    high, _ = score_of(example, interp)
    assert high == pytest.approx(1.0), f"a judge score of 1.5 was not clamped: {high}"
    monkeypatch.setattr(api, "judge", recording_stub(calls, -0.5, JUDGE_NOTES))
    low, _ = score_of(example, interp)
    assert low == pytest.approx(0.0), f"a judge score of -0.5 was not clamped: {low}"

def test_metric_forwards_raw_payloads_never_flattened(monkeypatch):
    api = judge_api()
    calls = []
    monkeypatch.setattr(api, "judge", recording_stub(calls, 0.75, JUDGE_NOTES))
    example, interp, steps = interp_pair()
    score_of(example, interp)
    assert calls, "the metric never called the judge"
    assert calls[0]["predicted"] == stripped([step.model_dump() for step in steps]), \
        f"the judge saw flattened payloads: {calls[0]['predicted']}"
    assert calls[0]["expected"] == stripped(example["expected_payloads"]), \
        "the judge never saw the expected payloads"
    assert calls[0]["brief_text"] == BRIEF_TEXT, "the judge never saw the brief text"


def test_gate_abstain_scores_zero_without_calling_the_judge(monkeypatch):
    api = judge_api()
    models = require("priority.interpreter.models")
    abstained = models.Interpretation(
        brief_id="b-made-up", facts=made_facts(),
        abstained=models.Abstain(reason="kind_not_allowed",
                                 detail="step 1: the kind launch_missile is not allowed"))
    calls = []
    monkeypatch.setattr(api, "judge", recording_stub(calls, 0.0, JUDGE_NOTES))
    example = make_example(make_label(2)) | {"brief_text": BRIEF_TEXT,
                                             "expected_payloads": [{"kind": "continue"}]}
    value, feedback = score_of(example, abstained)
    assert value == pytest.approx(0.0), f"a gate fault scored {value}, want 0.00"
    assert "disallowed" in feedback.lower(), f"feedback names no kind check: {feedback}"
    assert calls == [], "a gate abstain reached the judge"


def test_gepa_feedback_wraps_the_judge_score_as_a_prediction(monkeypatch):
    api = judge_api()
    monkeypatch.setattr(api, "judge", recording_stub([], 0.75, JUDGE_NOTES))
    optimise = require("priority.optimise")
    example, interp, _ = interp_pair()
    feedback = optimise.gepa_feedback(example, interp)
    assert isinstance(feedback, dspy.Prediction), "gepa_feedback returned no dspy Prediction"
    assert feedback.score == pytest.approx(0.75), \
        f"gepa_feedback moved the judge score to {feedback.score}"
    assert "the questions match" in feedback.feedback, \
        f"the wrapped feedback lost the judge notes: {feedback.feedback}"


def test_named_predictor_keeps_the_program_score_with_field_notes(monkeypatch):
    api = judge_api()
    monkeypatch.setattr(api, "judge", recording_stub([], 0.75, JUDGE_NOTES))
    example, interp, _ = interp_pair()
    program_value, _ = score_of(example, interp)
    value, feedback = score_of(example, interp, None, "fill['reply']", None)
    assert value == pytest.approx(program_value), \
        f"naming a predictor moved the score from {program_value} to {value}"
    assert feedback.startswith("predictor fill['reply']:"), \
        f"the feedback does not name the predictor: {feedback}"
    assert "the questions match" in feedback, \
        f"the predictor feedback lost the judge field notes: {feedback}"


# ---- Per-stop lines carry the payload score ------------------------------------


def run_eval_with_stub(monkeypatch, tmp_path, split_name):
    """Run `priority eval` in process with a stub interpreter. Return exit code and output."""
    interpreter = require("priority.interpreter")
    config = require("priority.config")
    manifest_path, labels_path, real_dir, parts = write_eval_world(tmp_path)
    monkeypatch.setattr(config, "load_key",
                        lambda *args, **kwargs: (_ for _ in ()).throw(
                            AssertionError("a test reached for the real key")))

    from eval_support import StubInterpreter
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


def test_eval_per_stop_lines_carry_facts_steps_validity_and_payload(monkeypatch, tmp_path):
    api = judge_api()
    notes = ["facts: all facts match.", "steps: the kinds match.",
             "validity: the output parses.", "payload: the questions match."]
    monkeypatch.setattr(api, "judge", recording_stub([], 0.8, notes))
    code, printed, parts = run_eval_with_stub(monkeypatch, tmp_path, "train")
    assert code == 0, f"eval failed: {printed[-500:]}"
    stop_lines = [line for line in printed.splitlines() if line.startswith("score stop ")]
    assert stop_lines, "the report prints no per-stop score lines"
    assert all("payload" in line for line in stop_lines), \
        "per-stop lines carry no payload score"
    for token in ("facts", "steps", "validity", "payload"):
        assert token in printed.lower(), f"the report never names {token}"
    session_lines = [line for line in printed.splitlines() if line.startswith("session ")]
    assert session_lines, "the report lost its per-session aggregation lines"
    assert all("overall" in line for line in session_lines), \
        "the per-session aggregation lines changed shape"
    assert {line.split()[1] for line in session_lines} == set(parts["train"])
