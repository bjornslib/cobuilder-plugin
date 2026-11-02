"""Score one labelled stop against one prediction, with GEPA feedback.

The judge sees every stop, once. It gets the brief text, the predicted payload object, and the reference
object `{"priority", "steps"}` (see `payload_rules`). For an abstain, the judge gets the abstain with the raw
reply and the error text in place of a payload, and it explains what the model must change. Code pins the
score in four cases (`payload_rules.pinned`). In every other case the clamped judge score is final, and a
judge stub note scores 0. The feedback holds the pinned-case note, when one applies, and then the judge notes.
The eval path and the GEPA path score the same Prediction object.
"""
from __future__ import annotations

from priority.evaluation.payload_rules import get_field, pinned, predicted_object, reference_object

JUDGE_ERROR_MARK = "judge error:"  # the note that `judge.judge` returns when its call fails


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
    """Score one stop. Return the value, the feedback, and whether the judge call failed with no rule pinned."""
    reference = reference_object(example)
    predicted = predicted_object(prediction)
    value, notes = _judged(example, predicted, reference)
    rule = pinned(prediction, predicted, reference)
    if rule is None:
        return (value, notes, JUDGE_ERROR_MARK in notes)
    return (rule[0], f"{rule[1]} {notes}".strip(), False)


def score(example: object, prediction: object, trace: object = None,
          pred_name: object = None, pred_trace: object = None) -> tuple[float, str]:
    """Score one stop from 0 to 1 with feedback. The GEPA arguments do not change the result."""
    value, feedback, _ = score_checked(example, prediction)
    return (value, feedback)
