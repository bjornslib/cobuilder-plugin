"""The payload rules that score a stop before, or instead of, the judge.

The metric reads the candidate payload and the reference payload as two step
lists. Four rules never call the judge: any abstain scores 0 and names its
reason, a reference with no candidate payload scores 0 and names the triage
status, a candidate payload where none is due scores 0 and names each kind,
and two empty lists score 1. A gate fault keeps its named gate note.
"""
from __future__ import annotations

# The label-free gate: a mechanical fault scores 0.00 with a named gate note.
GATE_REASONS = frozenset({"invalid_output", "kind_not_allowed", "quote_not_in_brief"})


def get_field(obj: object, name: str, default: object = None) -> object:
    """Read one field from a dict or an attribute-style object."""
    if isinstance(obj, dict):
        return obj.get(name, default)
    return getattr(obj, name, default)


def _abstain(prediction: object) -> object:
    """The Abstain of a prediction, as a dict or a model, or None."""
    abstain = get_field(prediction, "abstain")
    if abstain is None:
        abstain = get_field(prediction, "abstained")
    return abstain


def abstain_reason(prediction: object) -> str | None:
    """The Abstain reason of a prediction, or None when it did not abstain."""
    abstain = _abstain(prediction)
    return None if abstain is None else get_field(abstain, "reason")


def gate_feedback(reason: str, detail: str) -> str:
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


def abstain_note(prediction: object) -> str | None:
    """The 0-score note of an abstained prediction, or None when it did not abstain."""
    reason = abstain_reason(prediction)
    if reason is None:
        return None
    detail = str(get_field(_abstain(prediction), "detail", "") or "")
    if reason in GATE_REASONS:
        return gate_feedback(reason, detail)
    return f"abstain: the stop abstained ({reason}: {detail})"


def is_interp(prediction: object) -> bool:
    """Whether the prediction is a raw Interpretation, not a flat dict."""
    return hasattr(prediction, "advice") and hasattr(prediction, "brief_id")


def as_steps(payloads: object) -> list:
    """One step list: a single step dict becomes a one-item list, None becomes []."""
    if payloads is None:
        return []
    if isinstance(payloads, dict):
        return [payloads]
    return list(payloads)


def candidate_steps(prediction: object) -> list:
    """The candidate payload as a step list. An Interpretation dumps its proposal."""
    if not is_interp(prediction):
        return as_steps(get_field(prediction, "payloads"))
    advice = getattr(prediction, "advice", None)
    if advice is None:
        return []
    return [step.model_dump() for step in advice.proposal.steps]


def candidate_status(prediction: object) -> object:
    """The triage status of the candidate, from its facts or its flat field."""
    facts = getattr(prediction, "facts", None) if is_interp(prediction) else None
    if facts is not None:
        return facts.status
    return get_field(prediction, "status")


def _kind(step: object) -> object:
    """The kind of one step dict, or the step itself when it holds no kind."""
    return get_field(step, "kind", step) if isinstance(step, dict) else step


def rule_score(prediction: object, predicted: list, reference: list) -> tuple[float, str] | None:
    """The score and note of a rule that needs no judge, or None when the judge must grade."""
    note = abstain_note(prediction)
    if note is not None:
        return (0.0, note)
    if reference and not predicted:
        return (0.0, f"payload: missing, the candidate triage says "
                     f"{candidate_status(prediction)} and writes no payload where one is due.")
    if predicted and not reference:
        kinds = ", ".join(str(_kind(step)) for step in predicted)
        return (0.0, f"payload: none is due, but the candidate writes {kinds}.")
    if not predicted and not reference:
        return (1.0, "payload: none is due, and the candidate writes none.")
    return None
