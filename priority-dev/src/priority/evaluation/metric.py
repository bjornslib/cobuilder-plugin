"""Score one labelled stop against one prediction, with GEPA feedback.

Weights (slice 16): facts 0.4 (each of the five fields 0.08), step kinds
0.4 (the first step 0.2, the whole ordered list 0.2), grounding 0.1 (every
quote is in the brief), validity 0.1 (no Abstain from a model fault).

`score` follows the GEPA signature: it takes the example, the prediction,
and three unused arguments (trace, prediction name, prediction trace), and
it returns the score from 0 to 1 with a feedback text.
"""
from __future__ import annotations

FACT_FIELDS = ("status", "needs_human", "answer_class", "risk", "priority_hint")
EACH_FACT_SHARE = 0.08
FIRST_STEP_SHARE = 0.2
STEP_LIST_SHARE = 0.2
GROUNDING_SHARE = 0.1
VALIDITY_SHARE = 0.1

# An Abstain from one of these reasons means the model ran and failed, so the
# validity share is lost. A brief-level Abstain means the model never ran.
MODEL_FAULTS = frozenset({"model_error", "invalid_output", "quote_not_in_brief", "kind_not_allowed"})


def _get(obj: object, name: str, default: object = None) -> object:
    """Read one field from a dict or an attribute-style object."""
    if isinstance(obj, dict):
        return obj.get(name, default)
    return getattr(obj, name, default)


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


def _grounding_ok(quotes: object, brief_text: object) -> bool:
    """Every quote is an exact substring of the brief. No quotes needs nothing."""
    if not quotes:
        return True
    text = brief_text if isinstance(brief_text, str) else ""
    return all(isinstance(quote, str) and quote and quote in text for quote in quotes)


def _abstain_reason(prediction: object) -> str | None:
    """The Abstain reason of a prediction, or None when it did not abstain."""
    abstain = _get(prediction, "abstain")
    if abstain is None:
        return None
    return _get(abstain, "reason")


def components(example: object, prediction: object) -> dict:
    """The score parts: facts, steps, grounding, validity, overall, and fact hits."""
    fact_ok = {field: _fact_ok(_get(example, field), _get(prediction, field)) for field in FACT_FIELDS}
    facts = sum(EACH_FACT_SHARE for hit in fact_ok.values() if hit)
    label_steps = _get(example, "steps", []) or []
    pred_steps = _get(prediction, "steps", []) or []
    first = FIRST_STEP_SHARE if _first_ok(label_steps, pred_steps) else 0.0
    rest = STEP_LIST_SHARE if _list_ok(label_steps, pred_steps) else 0.0
    grounding = GROUNDING_SHARE if _grounding_ok(_get(prediction, "quotes"), _get(example, "brief_text")) else 0.0
    reason = _abstain_reason(prediction)
    validity = 0.0 if reason in MODEL_FAULTS else VALIDITY_SHARE
    return {"facts": facts, "fact_ok": fact_ok, "first_step": first, "step_list": rest,
            "steps": first + rest, "grounding": grounding, "validity": validity,
            "overall": facts + first + rest + grounding + validity}


def _feedback(example: object, prediction: object, parts: dict) -> str:
    """One line per lost share, naming the field, kind, quote, or reason."""
    notes = []
    for field in FACT_FIELDS:
        if not parts["fact_ok"][field]:
            notes.append(f"fact {field}: predicted {_get(prediction, field)!r}, "
                         f"label {_get(example, field)!r}")
    label_steps = _get(example, "steps", []) or []
    pred_steps = _get(prediction, "steps", []) or []
    if parts["first_step"] == 0.0:
        notes.append(f"first step: predicted {pred_steps[0]!r}" if pred_steps
                     else f"first step: predicted no step, label {label_steps!r}")
    if parts["step_list"] == 0.0:
        notes.append(f"step list: predicted {pred_steps!r}, label {label_steps!r}")
    if parts["grounding"] == 0.0:
        notes.append(f"grounding: a quote is not in the brief text {list(_get(prediction, 'quotes') or [])!r}")
    if parts["validity"] == 0.0:
        notes.append(f"validity: abstained from a model fault ({_abstain_reason(prediction)})")
    if not notes:
        return "all facts, steps, quotes, and validity match the label."
    return " ".join(notes)


def score(example: object, prediction: object, trace: object = None,
          pred_name: object = None, pred_trace: object = None) -> tuple[float, str]:
    """Score one stop from 0 to 1 with GEPA feedback. Extra args are ignored."""
    parts = components(example, prediction)
    return (parts["overall"], _feedback(example, prediction, parts))
