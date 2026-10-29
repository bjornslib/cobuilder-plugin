"""Score one labelled stop against one prediction, with GEPA feedback.

The judge scores the payload only, against the reference payload of the
label (`expected_payloads`): one step, a list of steps, or `[]` for "no
payload due". A stop with no reference raises, so it never counts. The rules
in `payload_rules` run first and never call the judge: any abstain scores 0
and names its reason (a gate fault keeps its gate note), a missing candidate
payload scores 0 and names the triage status, a payload where none is due
scores 0 and names each kind, and two empty lists score 1. Otherwise the
judge grades the two step lists with the code-set fields (`CODE_FIELDS`)
removed, and the metric clamps its score. A judge stub note scores 0.
`components` keeps the legacy facts, step kinds, and validity parts as report
diagnostics only. `score` follows the GEPA signature: it takes the example,
the prediction, the trace, the predictor name, and the predictor trace, and
it returns the score from 0 to 1 with a feedback text.
"""
from __future__ import annotations

from priority.evaluation.payload_rules import abstain_reason, as_steps, candidate_steps, get_field, rule_score

FACT_FIELDS = ("status", "needs_human", "answer_class", "risk", "priority_hint")
EACH_FACT_SHARE = 0.10
FIRST_STEP_SHARE = 0.2
STEP_LIST_SHARE = 0.2
VALIDITY_SHARE = 0.1

# The fields that code sets on each step. They never reach the judge.
CODE_FIELDS = ("session_id", "author", "confidence", "evidence_quote")

# An Abstain from one of these reasons means the model ran and failed, so the
# validity share is lost. A brief-level Abstain means the model never ran.
MODEL_FAULTS = frozenset({"model_error", "invalid_output", "quote_not_in_brief", "kind_not_allowed"})


def _fact_ok(expected: object, actual: object) -> bool:
    """A fact matches, or the prediction is one of the accepted label values."""
    if isinstance(expected, list):
        return actual in expected
    return actual == expected


def _accepted(kind: object, slot: object) -> bool:
    """A predicted kind is accepted at one label position."""
    if isinstance(slot, list):
        return kind in slot
    return kind == slot


def _first_ok(label_steps: list, pred_steps: list) -> bool:
    """The predicted first step is accepted at the first label position."""
    if not label_steps and not pred_steps:
        return True
    if not label_steps or not pred_steps:
        return False
    return bool(_accepted(pred_steps[0], label_steps[0]))


def _list_ok(label_steps: list, pred_steps: list) -> bool:
    """The whole ordered list matches past the first step, which scores alone."""
    if not label_steps and not pred_steps:
        return True
    if not label_steps or not pred_steps:
        return False
    if len(label_steps) != len(pred_steps):
        return False
    return all(_accepted(pred, slot) for pred, slot in zip(pred_steps[1:], label_steps[1:]))


def components(example: object, prediction: object) -> dict:
    """The report diagnostics: facts, steps, validity, overall, and fact hits."""
    fact_ok = {field: _fact_ok(get_field(example, field), get_field(prediction, field))
               for field in FACT_FIELDS}
    facts = sum(EACH_FACT_SHARE for hit in fact_ok.values() if hit)
    label_steps = get_field(example, "steps", []) or []
    pred_steps = get_field(prediction, "steps", []) or []
    first = FIRST_STEP_SHARE if _first_ok(label_steps, pred_steps) else 0.0
    rest = STEP_LIST_SHARE if _list_ok(label_steps, pred_steps) else 0.0
    validity = 0.0 if abstain_reason(prediction) in MODEL_FAULTS else VALIDITY_SHARE
    return {"facts": facts, "fact_ok": fact_ok, "first_step": first, "step_list": rest,
            "steps": first + rest, "validity": validity,
            "overall": facts + first + rest + validity}


def _trace_snippet(pred_trace: object, limit: int = 200) -> str:
    """One line of the named predictor's trace, or "" when it holds nothing."""
    try:
        if not pred_trace:
            return ""
        text = " ".join(repr(pred_trace).split())
    except Exception:  # noqa: BLE001 (a trace may hold anything, and feedback must never fail)
        return ""
    return text[:limit]


def _clamp(value: float) -> float:
    """One score forced into 0..1."""
    try:
        number = float(value)
    except (TypeError, ValueError):
        return 0.0
    return min(1.0, max(0.0, number))


def _strip(steps: list) -> list:
    """The steps as the judge sees them: each code-set field removed."""
    return [{key: value for key, value in step.items() if key not in CODE_FIELDS}
            if isinstance(step, dict) else step for step in steps]


def _reference(example: object) -> list:
    """The reference step list of the example. A missing reference raises."""
    value = get_field(example, "expected_payloads")
    if value is None:
        raise ValueError("the example has no reference payload (expected_payloads)")
    return as_steps(value)


def _judged(example: object, predicted: list, reference: list) -> tuple[float, str]:
    """The judge score and joined notes. A judge stub note scores 0."""
    from priority.evaluation import judge as judge_module

    raw, notes = judge_module.judge(get_field(example, "brief_text", ""), predicted, reference)
    notes = list(notes or [])
    if any("judge stub" in str(note).lower() for note in notes):
        return (0.0, " ".join(str(note) for note in notes))
    return (_clamp(raw), " ".join(str(note) for note in notes))


def _targeted(note: str, pred_name: object, pred_trace: object) -> str:
    """The feedback for one GEPA predictor: its name, the note, and its trace."""
    if pred_name is None:
        return note
    text = f"predictor {pred_name}: " + note
    snippet = _trace_snippet(pred_trace)
    return text + f" trace: {snippet}" if snippet else text


def score(example: object, prediction: object, trace: object = None,
          pred_name: object = None, pred_trace: object = None) -> tuple[float, str]:
    """Score one stop from 0 to 1 with GEPA feedback. The extra args target the

    feedback at one predictor; the score never changes with them."""
    reference = _strip(_reference(example))
    predicted = _strip(candidate_steps(prediction))
    ruled = rule_score(prediction, predicted, reference)
    value, note = ruled if ruled is not None else _judged(example, predicted, reference)
    return (value, _targeted(note, pred_name, pred_trace))
