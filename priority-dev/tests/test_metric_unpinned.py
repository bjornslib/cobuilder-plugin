"""RED: the judge, not code, decides the cases that code used to pin.

The contract. A stop that did not abstain is scored by the judge in every case: a reference with steps
against no predicted step, a reference `[]` against predicted steps, and two empty lists. The metric
returns the judge value as it is, and the feedback is the judge notes alone. The judge gets each empty list
as the text `[]` inside `predicted_payloads` and `expected_payloads`. Only an abstain stays pinned to 0
(`test_propose_metric.py` and `test_optimise_judge_failure.py` keep those tests).

A failed judge call on one of the three formerly pinned cases is a judge error now:
`score_checked` returns judge_error True, and `score` retries and then raises `JudgeFailure`.
`priority judge-check` scores each pair side with the same rule. Every judge, model, and file is made up,
so no test makes a live model call.
"""
from __future__ import annotations

import json
import re

import pytest

from interpret_support import DummyLM, dspy, no_live_call  # noqa: F401
from judge_check_support import PAIR_STEPS, GradingJudge, agreeing, pair, run_check
from judge_ref_support import BRIEF_TEXT, CODE, JudgeRecorder, ask_step, install_judge, reply_step, require, stripped

NOTE = "judge: the made-up reply answers the paint question."
ERROR_NOTE = "judge error: the judge call failed (TimeoutError), scored 0"

# Each case is (reference steps, predicted steps). Code used to pin 0, 0, and 1 here.
CASES = {"missing steps": ([ask_step()], []), "spurious steps": ([], [reply_step()]), "two empty lists": ([], [])}
CASE_IDS = list(CASES)


def example(reference, priority: str = "P1"):
    """One made-up metric example with a reference payload."""
    return dspy.Example(brief_text=BRIEF_TEXT, priority=priority, expected_payloads=reference)


def prediction(steps=(), *, priority: str = "P2"):
    """One made-up Prediction as forward returns it, with code-set fields on each step."""
    return dspy.Prediction(status="waiting_answer", needs_human=True, priority=priority,
                           steps=[item | CODE for item in steps], abstain=None)


class FailingJudge:
    """A stub judge whose calls fail the way `judge.judge` reports a failed call, `failures` times, then work."""

    def __init__(self, failures: int = 10**6, value: float = 0.7):
        self.failures, self.value, self.calls = failures, value, 0

    def __call__(self, brief_text, predicted, expected):
        self.calls += 1
        if self.calls <= self.failures:
            return (0.0, [ERROR_NOTE])
        return (self.value, [NOTE])


@pytest.fixture
def no_wait(monkeypatch):
    """Record each retry wait and sleep for none."""
    seen: list = []
    monkeypatch.setattr(require("priority.evaluation.metric"), "sleep", seen.append, raising=False)
    return seen


# ---- Contract 1: the judge score is final ---------------------------------------


@pytest.mark.parametrize("judged", [0.4, 0.9])
@pytest.mark.parametrize("case", CASE_IDS)
def test_score_checked_returns_exactly_the_judge_value_and_notes(monkeypatch, case, judged):
    reference, steps = CASES[case]
    install_judge(monkeypatch, JudgeRecorder(judged, [NOTE]))
    value, feedback, judge_error = require("priority.evaluation.metric").score_checked(
        example(reference), prediction(steps))
    assert value == judged, f"{case}: the value is {value}, not the judge value {judged}"
    assert feedback == NOTE, f"{case}: the feedback is not the judge notes alone: {feedback!r}"
    assert judge_error is False


@pytest.mark.parametrize("judged", [0.4, 0.9])
@pytest.mark.parametrize("case", CASE_IDS)
def test_score_returns_exactly_the_judge_value_and_notes(monkeypatch, case, judged):
    reference, steps = CASES[case]
    install_judge(monkeypatch, JudgeRecorder(judged, [NOTE]))
    value, feedback = require("priority.evaluation.metric").score(example(reference), prediction(steps))
    assert value == judged, f"{case}: the value is {value}, not the judge value {judged}"
    assert feedback == NOTE, f"{case}: the feedback is not the judge notes alone: {feedback!r}"


@pytest.mark.parametrize("case", CASE_IDS)
def test_the_feedback_is_every_judge_note_and_no_code_note(monkeypatch, case):
    reference, steps = CASES[case]
    install_judge(monkeypatch, JudgeRecorder(0.4, ["first part differs.", "second part matches."]))
    _, feedback = require("priority.evaluation.metric").score(example(reference), prediction(steps))
    assert feedback == "first part differs. second part matches."
    for old_note in ("payload: missing", "none is due", "the prediction holds"):
        assert old_note not in feedback, f"{case}: the feedback still holds a code note: {feedback!r}"


@pytest.mark.parametrize("judged,clamped", [(1.5, 1.0), (-0.5, 0.0)])
@pytest.mark.parametrize("case", CASE_IDS)
def test_the_judge_value_of_a_formerly_pinned_case_is_clamped_not_replaced(monkeypatch, case, judged, clamped):
    reference, steps = CASES[case]
    install_judge(monkeypatch, JudgeRecorder(judged, [NOTE]))
    value, _ = require("priority.evaluation.metric").score(example(reference), prediction(steps))
    assert value == clamped


@pytest.mark.parametrize("case", CASE_IDS)
def test_the_judge_is_called_once_and_gets_the_empty_list_as_it_is(monkeypatch, case):
    reference, steps = CASES[case]
    judge = install_judge(monkeypatch, JudgeRecorder(0.4, [NOTE]))
    require("priority.evaluation.metric").score(example(reference, "P1"), prediction(steps, priority="P2"))
    assert len(judge.calls) == 1, f"{case}: the judge was called {len(judge.calls)} times"
    assert judge.calls[0]["predicted"] == {"priority": "P2", "steps": stripped(steps)}
    assert judge.calls[0]["expected"] == {"priority": "P1", "steps": reference}
    assert judge.calls[0]["brief_text"] == BRIEF_TEXT


# ---- Contract 1: the text that the judge model reads ----------------------------


def field_text(messages: str, name: str) -> str:
    """The text of one input field in the last message that the judge model got."""
    match = re.search(rf"\[\[ ## {name} ## \]\]\n(.*?)(?=\n\n\[\[ ## |\Z)", messages, re.S)
    assert match, f"the judge prompt holds no {name} field: {messages[-600:]!r}"
    return match.group(1).strip()


@pytest.mark.parametrize("case", CASE_IDS)
def test_the_judge_model_reads_each_empty_list_as_the_text_empty_brackets(case):
    reference, steps = CASES[case]
    language = DummyLM([{"score": 0.4, "notes": [NOTE]}])
    previous = dspy.settings.lm
    dspy.settings.configure(lm=language)
    try:
        value, feedback, _ = require("priority.evaluation.metric").score_checked(
            example(reference), prediction(steps))
    finally:
        dspy.settings.configure(lm=previous)
    assert (value, feedback) == (0.4, NOTE), f"{case}: the DummyLM judge did not decide the score"
    prompt = language.history[-1]["messages"][-1]["content"]
    texts = {"predicted_payloads": field_text(prompt, "predicted_payloads"),
             "expected_payloads": field_text(prompt, "expected_payloads")}
    assert json.loads(texts["predicted_payloads"])["steps"] == stripped(steps)
    assert json.loads(texts["expected_payloads"])["steps"] == reference
    for name, held in (("predicted_payloads", steps), ("expected_payloads", reference)):
        assert ('"steps": []' in texts[name]) is (held == []), f"{case}: {name} holds the wrong text: {texts[name]!r}"


# ---- Contract 3: a failed judge call on a formerly pinned case -------------------


@pytest.mark.parametrize("case", CASE_IDS)
def test_score_checked_marks_a_failed_judge_call_on_a_formerly_pinned_case(monkeypatch, case):
    reference, steps = CASES[case]
    judge = install_judge(monkeypatch, FailingJudge())
    value, feedback, judge_error = require("priority.evaluation.metric").score_checked(
        example(reference), prediction(steps))
    assert judge_error is True, f"{case}: a pinned rule hid the failed judge call"
    assert value == 0.0 and "judge error:" in feedback, (value, feedback)
    assert judge.calls == 1, f"the eval path made {judge.calls} judge calls for one stop, not 1"


@pytest.mark.parametrize("case", CASE_IDS)
def test_score_retries_a_failed_judge_call_and_then_raises_judge_failure(monkeypatch, no_wait, case):
    reference, steps = CASES[case]
    metric = require("priority.evaluation.metric")
    judge = install_judge(monkeypatch, FailingJudge())
    with pytest.raises(metric.JudgeFailure) as raised:
        metric.score(example(reference), prediction(steps))
    assert not isinstance(raised.value, Exception), "dspy turns an Exception from the metric into a score of 0"
    assert judge.calls == metric.MAX_TRIES, f"{case}: {judge.calls} judge calls, not {metric.MAX_TRIES}"
    assert len(no_wait) == metric.MAX_TRIES - 1, f"{case}: the waits between tries were {no_wait}"


@pytest.mark.parametrize("case", CASE_IDS)
def test_score_returns_the_real_judge_score_after_one_failed_try(monkeypatch, no_wait, case):
    reference, steps = CASES[case]
    judge = install_judge(monkeypatch, FailingJudge(failures=1, value=0.7))
    value, feedback = require("priority.evaluation.metric").score(example(reference), prediction(steps))
    assert (value, feedback) == (0.7, NOTE), f"{case}: the retry did not give the judge score and notes"
    assert judge.calls == 2


@pytest.mark.parametrize("name", ("gepa_feedback", "plain_score"))
@pytest.mark.parametrize("case", CASE_IDS)
def test_the_optimise_metrics_stop_the_run_on_a_failed_judge_call_of_a_formerly_pinned_case(
        monkeypatch, no_wait, case, name):
    reference, steps = CASES[case]
    install_judge(monkeypatch, FailingJudge())
    metric_fn = getattr(require("priority.optimise"), name)
    with pytest.raises(require("priority.evaluation.metric").JudgeFailure):
        metric_fn(example(reference), prediction(steps))


@pytest.mark.parametrize("name", ("gepa_feedback", "plain_score"))
@pytest.mark.parametrize("case", CASE_IDS)
def test_the_optimise_metrics_return_the_judge_score_of_a_formerly_pinned_case(monkeypatch, case, name):
    reference, steps = CASES[case]
    install_judge(monkeypatch, JudgeRecorder(0.4, [NOTE]))
    result = getattr(require("priority.optimise"), name)(example(reference), prediction(steps))
    if name == "gepa_feedback":
        assert (result.score, result.feedback) == (0.4, NOTE)
    else:
        assert result == 0.4


# ---- Contract 2: an abstain stays pinned ------------------------------------------


def test_an_abstain_is_the_only_stop_that_judge_score_does_not_decide(monkeypatch):
    judge = install_judge(monkeypatch, JudgeRecorder(0.9, [NOTE]))
    abstain = {"reason": "invalid_output", "detail": "made-up detail", "raw": "made-up raw"}
    pred = dspy.Prediction(status=None, needs_human=None, priority=None, steps=[], abstain=abstain)
    value, feedback, judge_error = require("priority.evaluation.metric").score_checked(example([]), pred)
    assert value == 0.0 and judge_error is False and NOTE in feedback
    assert judge.calls[0]["predicted"] == {"abstain": abstain}


# ---- Contract 4: `priority judge-check` pair sides --------------------------------


class EmptySideJudge(GradingJudge):
    """The grading judge, but a side with no steps scores 0.8 and the judge notes it."""

    def __call__(self, brief_text, predicted, expected):
        if isinstance(predicted, dict) and predicted.get("steps") == []:
            self.calls.append({"brief_text": brief_text, "predicted": predicted, "expected": expected})
            return (0.8, ["the empty side was judged"])
        return super().__call__(brief_text, predicted, expected)


def empty_side_pair(index: int, empty: str) -> dict:
    """One pair whose side `empty` holds no step and whose other side is a reply graded 0.3. The human picks the empty side."""
    entry = pair(index, 0.3, 0.3, empty)
    entry[empty] = {"priority": "P2", "steps": []}
    return entry


@pytest.mark.parametrize("empty", ("a", "b"))
def test_a_pair_side_with_no_steps_is_judged_not_pinned(monkeypatch, tmp_path, empty):
    judge = EmptySideJudge()
    pairs = agreeing(5) + [empty_side_pair(5, empty)]
    code, printed = run_check(monkeypatch, tmp_path, pairs, judge)
    empty_calls = [call for call in judge.calls if call["predicted"].get("steps") == []]
    assert len(empty_calls) == 2, f"the empty side was judged {len(empty_calls)} times, not 2 (repeats)"
    assert all(call["expected"]["steps"] == PAIR_STEPS for call in empty_calls)
    assert "human agreement: 6/6 = 1.00" in printed, \
        f"the judge gave 0.8 to the empty side and 0.3 to the other, so it must match the human pick:\n{printed}"
    assert code == 0, printed


@pytest.mark.parametrize("empty", ("a", "b"))
def test_a_failed_judge_call_on_a_pair_side_with_no_steps_stops_the_check(monkeypatch, tmp_path, no_wait, empty):
    class FailsOnEmpty(GradingJudge):
        def __call__(self, brief_text, predicted, expected):
            if predicted.get("steps") == []:
                self.calls.append({"predicted": predicted})
                return (0.0, [ERROR_NOTE])
            return super().__call__(brief_text, predicted, expected)

    judge = FailsOnEmpty()
    code, printed = run_check(monkeypatch, tmp_path, agreeing(5) + [empty_side_pair(5, empty)], judge)
    assert code == 1, f"a failed judge call on a side that code no longer pins exited {code}:\n{printed}"
    assert "judge-check failed" in printed, printed
    assert len([call for call in judge.calls if call["predicted"].get("steps") == []]) \
        == require("priority.evaluation.metric").MAX_TRIES
