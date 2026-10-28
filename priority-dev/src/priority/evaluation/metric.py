"""Score one labelled stop against one prediction, with GEPA feedback.

Two paths: the judge path and the legacy path. The gate runs first with no
label: a mechanical fault (unparsable output, a bad enum, a disallowed kind,
an out-of-range step count, or an ask_human step with no questions) abstains
with a named 0.00 score and never reaches the judge. Otherwise, when the
example carries the expected payloads and the prediction carries the raw
payloads, the judge grades meaning and the metric only clamps its score and
wraps it as feedback. When the example carries no expected payloads (older worlds
without payload labels), the metric falls back to the legacy weights: facts 0.5
(each of the five fields 0.10), step kinds 0.4 (the first step 0.2, the whole
ordered list 0.2), validity 0.1 (no Abstain from a model fault). It skips the
payload part and names the skip in the feedback. Quotes are not scored: a
paraphrased quote scores the same as the exact quote.

`score` follows the GEPA signature: it takes the example, the prediction,
and three unused arguments (trace, prediction name, prediction trace), and
it returns the score from 0 to 1 with a feedback text.
"""
from __future__ import annotations

FACT_FIELDS = ("status", "needs_human", "answer_class", "risk", "priority_hint")
EACH_FACT_SHARE = 0.10
FIRST_STEP_SHARE = 0.2
STEP_LIST_SHARE = 0.2
VALIDITY_SHARE = 0.1

# An Abstain from one of these reasons means the model ran and failed, so the
# validity share is lost. A brief-level Abstain means the model never ran.
MODEL_FAULTS = frozenset({"model_error", "invalid_output", "quote_not_in_brief", "kind_not_allowed"})

# The skip note: when the example carries no expected payloads, the metric
# scores facts and steps only and names the skipped payload part.
PAYLOAD_SKIP_NOTE = "payload: skipped (no expected payload labels, scored facts and steps only)."

# The label-free gate: a mechanical fault scores 0.00 with a named note and
# never calls the judge. Brief-level faults (the model never ran) keep the
# legacy path so older worlds still score.
GATE_REASONS = frozenset({"invalid_output", "kind_not_allowed", "quote_not_in_brief"})

_MISSING = object()


def _with_skip_note(feedback: str) -> str:
    """The legacy feedback with the skipped payload part named."""
    if not feedback:
        return PAYLOAD_SKIP_NOTE
    return feedback + " " + PAYLOAD_SKIP_NOTE


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


def _abstain_reason(prediction: object) -> str | None:
    """The Abstain reason of a prediction, or None when it did not abstain."""
    abstain = _get(prediction, "abstain")
    if abstain is None:
        abstain = _get(prediction, "abstained")
    if abstain is None:
        return None
    return _get(abstain, "reason")


def _abstain_detail(prediction: object) -> str:
    """The Abstain detail of a prediction, or "" when it did not abstain."""
    abstain = _get(prediction, "abstain")
    if abstain is None:
        abstain = _get(prediction, "abstained")
    if abstain is None:
        return ""
    return str(_get(abstain, "detail", "") or "")


def _gate_feedback(reason: str, detail: str) -> str:
    """The named 0-score note for one gate fault. It always names the check."""
    low = f"{reason} {detail}".lower()
    if reason == "kind_not_allowed" or "not an action kind" in low or "disallowed" in low:
        return f"gate: disallowed kind ({reason}: {detail})"
    if ("pick returned" in low or "step count" in low or "0 steps" in low
            or "4 steps" in low or "holds one to" in low):
        return f"gate: step count out of range ({reason}: {detail})"
    if "question" in low:
        return f"gate: ask_human holds no questions ({reason}: {detail})"
    if "literal_error" in low or "input should be '" in low or "enum" in low:
        return f"gate: bad enum value ({reason}: {detail})"
    if "not json" in low or "failed to parse" in low or "adapterparseerror" in low or "unparsable" in low:
        return f"gate: unparsable output ({reason}: {detail})"
    if reason == "quote_not_in_brief":
        return f"gate: empty quote ({reason}: {detail})"
    return f"gate: invalid output ({reason}: {detail})"


def _is_interp(prediction: object) -> bool:
    """Whether the prediction is a raw Interpretation, not a flat dict."""
    return hasattr(prediction, "advice") and hasattr(prediction, "brief_id")


def _predicted_payloads(prediction: object) -> object:
    """The raw payloads for the judge, or None when the prediction holds none."""
    if _is_interp(prediction):
        advice = getattr(prediction, "advice", None)
        if advice is None:
            return None
        try:
            steps = advice.proposal.steps
        except AttributeError:
            return None
        try:
            return [step.model_dump() for step in steps]
        except Exception:  # noqa: BLE001 (a step dump must never fail the metric)
            return None
    if isinstance(prediction, dict):
        return prediction.get("payloads")
    return None


def _expected_payloads(example: object) -> object:
    """The expected payloads, or the missing marker when the label holds none."""
    if isinstance(example, dict):
        value = example.get("expected_payloads", _MISSING)
    else:
        value = getattr(example, "expected_payloads", _MISSING)
    if value is None:
        return _MISSING
    return value


def components(example: object, prediction: object) -> dict:
    """The score parts: facts, steps, validity, overall, and fact hits."""
    fact_ok = {field: _fact_ok(_get(example, field), _get(prediction, field)) for field in FACT_FIELDS}
    facts = sum(EACH_FACT_SHARE for hit in fact_ok.values() if hit)
    label_steps = _get(example, "steps", []) or []
    pred_steps = _get(prediction, "steps", []) or []
    first = FIRST_STEP_SHARE if _first_ok(label_steps, pred_steps) else 0.0
    rest = STEP_LIST_SHARE if _list_ok(label_steps, pred_steps) else 0.0
    reason = _abstain_reason(prediction)
    validity = 0.0 if reason in MODEL_FAULTS else VALIDITY_SHARE
    return {"facts": facts, "fact_ok": fact_ok, "first_step": first, "step_list": rest,
            "steps": first + rest, "validity": validity,
            "overall": facts + first + rest + validity}


def _feedback(example: object, prediction: object, parts: dict) -> str:
    """One line per lost share, naming the field, kind, or reason."""
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
    if parts["validity"] == 0.0:
        notes.append(f"validity: abstained from a model fault ({_abstain_reason(prediction)})")
    if not notes:
        return "all facts, steps, and validity match the label."
    return " ".join(notes)


def _trace_snippet(pred_trace: object, limit: int = 200) -> str:
    """One line of the named predictor's trace, or "" when it holds nothing."""
    try:
        if not pred_trace:
            return ""
        text = " ".join(repr(pred_trace).split())
    except Exception:  # noqa: BLE001 (a trace may hold anything, and feedback must never fail)
        return ""
    return text[:limit]


def _predictor_feedback(example: object, prediction: object, parts: dict,
                        pred_name: object, pred_trace: object) -> str:
    """Feedback for one GEPA predictor: its own fields and trace. The score is untouched."""
    name = pred_name if isinstance(pred_name, str) else repr(pred_name)
    if not isinstance(pred_name, str):
        return f"predictor {name}: " + _feedback(example, prediction, parts)
    notes: list = []
    if name == "triage":
        for field in FACT_FIELDS:
            if not parts["fact_ok"][field]:
                notes.append(f"fact {field}: predicted {_get(prediction, field)!r}, "
                             f"label {_get(example, field)!r}")
        if not notes:
            notes.append("all facts match the label.")
    elif name == "pick":
        label_steps = _get(example, "steps", []) or []
        pred_steps = _get(prediction, "steps", []) or []
        if parts["first_step"] == 0.0:
            notes.append(f"first step: predicted {pred_steps[0]!r}" if pred_steps
                         else f"first step: predicted no step, label {label_steps!r}")
        if parts["step_list"] == 0.0:
            notes.append(f"step list: predicted {pred_steps!r}, label {label_steps!r}")
        if not notes:
            notes.append("the picked steps match the label.")
    elif name.startswith("fill"):
        reason = _abstain_reason(prediction)
        if reason is not None:
            notes.append(f"parse: the stop abstained ({reason}: {_get(_get(prediction, 'abstain'), 'detail')})")
        if not notes:
            notes.append("the payload parsed.")
    elif name in ("card", "combined"):
        question = _get(prediction, "question")
        if _get(prediction, "needs_human") and question is None:
            notes.append("card: the stop needs the human but the question card is missing.")
        elif not _get(prediction, "needs_human") and question is not None:
            notes.append("card: the stop needs nobody but a question card was written.")
        else:
            notes.append("the question card matches the stop.")
    else:
        return f"predictor {name}: " + _feedback(example, prediction, parts)
    snippet = _trace_snippet(pred_trace)
    if snippet:
        notes.append(f"trace: {snippet}")
    return f"predictor {name}: " + " ".join(notes)


def _clamp(value: float) -> float:
    """One score forced into 0..1."""
    try:
        number = float(value)
    except (TypeError, ValueError):
        return 0.0
    return min(1.0, max(0.0, number))


def score(example: object, prediction: object, trace: object = None,
          pred_name: object = None, pred_trace: object = None) -> tuple[float, str]:
    """Score one stop from 0 to 1 with GEPA feedback. The extra args target the

    feedback at one predictor; the score never changes with them."""
    reason = _abstain_reason(prediction)
    if reason in GATE_REASONS:
        detail = _abstain_detail(prediction)
        note = _gate_feedback(reason, detail)
        if pred_name is None:
            return (0.0, note)
        snippet = _trace_snippet(pred_trace)
        text = f"predictor {pred_name}: " + note
        if snippet:
            text += f" trace: {snippet}"
        return (0.0, text)
    expected = _expected_payloads(example)
    if expected is not _MISSING and reason is None:
        predicted = _predicted_payloads(prediction)
        if predicted is not None:
            from priority.evaluation.judge import judge

            brief_text = _get(example, "brief_text", "")
            raw, notes = judge(brief_text, predicted, expected)
            value = _clamp(raw)
            joined = " ".join(notes) if notes else ""
            if pred_name is None:
                return (value, joined)
            text = f"predictor {pred_name}: " + joined
            snippet = _trace_snippet(pred_trace)
            if snippet:
                text += f" trace: {snippet}"
            return (value, text)
    parts = components(example, prediction)
    if expected is _MISSING:
        if pred_name is None:
            return (parts["overall"], _with_skip_note(_feedback(example, prediction, parts)))
        return (parts["overall"], _with_skip_note(
            _predictor_feedback(example, prediction, parts, pred_name, pred_trace)))
    if pred_name is None:
        return (parts["overall"], _feedback(example, prediction, parts))
    return (parts["overall"], _predictor_feedback(example, prediction, parts, pred_name, pred_trace))
