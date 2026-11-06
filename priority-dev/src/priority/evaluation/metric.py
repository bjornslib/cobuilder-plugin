"""Score one labelled stop against one prediction, with GEPA feedback.

The judge sees every stop, once. It gets the brief text, the predicted payload object, and the reference
object `{"priority", "steps"}` (see `payload_rules`). For an abstain, the judge gets the abstain with the raw
reply and the error text in place of a payload, and it explains what the model must change. Code pins the
score of an abstain at 0 (`payload_rules.pinned`). In every other case, an empty payload included, the
clamped judge score is final, and a judge stub note scores 0. The feedback holds the abstain note, when one
applies, and then the judge notes. A failed judge call is a judge error in every case but an abstain.
The eval path and the GEPA path score the same Prediction object. A `model_error` abstain is no score on the
GEPA path: `score` raises ModelFailure for it, so that no optimiser trains on a false 0.
"""
from __future__ import annotations

import time

from priority.evaluation.payload_rules import abstain_of, get_field, pinned, predicted_object, reference_object

JUDGE_ERROR_MARK = "judge error:"  # the note that `judge.judge` returns when its call fails
MAX_TRIES = 3  # judge calls for one stop, the first call included
FIRST_WAIT = 1.0  # seconds before the second try; each next wait doubles
sleep = time.sleep  # read at call time, so a test can replace it


class JudgeFailure(BaseException):
    """The judge call failed on every try. It is not an Exception, because dspy turns an Exception from a
    metric into a score of 0, and the optimiser would train on it."""


class ModelFailure(BaseException):
    """The model call failed for a stop, with a `model_error` abstain. It is not an Exception, for the reason
    that JudgeFailure is not one."""


def _clamp(value: float) -> float:
    """One score forced into 0..1."""
    try:
        number = float(value)
    except (TypeError, ValueError):
        return 0.0
    return min(1.0, max(0.0, number))


def _judged(example: object, predicted: dict, reference: dict) -> tuple[float, str]:
    """The judge score and joined notes. A judge stub note scores 0."""
    from priority.evaluation import judge as judge_module

    raw, notes = judge_module.judge(get_field(example, "brief_text", ""), predicted, reference)
    text = " ".join(str(note) for note in notes or [])
    if "judge stub" in text.lower():
        return (0.0, text)
    return (_clamp(raw), text)


def score_checked(example: object, prediction: object) -> tuple[float, str, bool]:
    """Score one stop. Return the value, the feedback, and whether the judge call failed on a stop that is not an abstain."""
    reference = reference_object(example)
    predicted = predicted_object(prediction)
    value, notes = _judged(example, predicted, reference)
    rule = pinned(predicted)
    if rule is None:
        return (value, notes, JUDGE_ERROR_MARK in notes)
    return (rule[0], f"{rule[1]} {notes}".strip(), False)


def _stop_name(example: object) -> str:
    return f"session {get_field(example, 'session_id', '?')} stop {get_field(example, 'stop', '?')}"


def score(example: object, prediction: object, trace: object = None,
          pred_name: object = None, pred_trace: object = None, *, checked: object = None) -> tuple[float, str]:
    """Score one stop from 0 to 1 with feedback. A failed judge call is retried, and when every try fails
    this raises JudgeFailure. A `model_error` abstain raises ModelFailure, with no judge call. The GEPA
    arguments do not change the result. `checked` replaces the judge call, so a run can log its judge rows."""
    check = score_checked if checked is None else checked
    abstain = abstain_of(prediction)
    if abstain is not None and abstain.get("reason") == "model_error":
        raise ModelFailure(f"the model call failed for {_stop_name(example)}: {abstain.get('detail')}")
    for attempt in range(MAX_TRIES):
        value, feedback, judge_error = check(example, prediction)
        if not judge_error:
            return (value, feedback)
        if attempt + 1 < MAX_TRIES:
            sleep(FIRST_WAIT * 2 ** attempt)
    raise JudgeFailure(f"the judge call failed {MAX_TRIES} times for {_stop_name(example)}")
