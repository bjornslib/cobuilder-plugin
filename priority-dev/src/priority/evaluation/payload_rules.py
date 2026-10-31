"""The payload objects that the judge sees, and the four cases where code pins the score.

The predicted object is `{"priority", "steps"}` with the code-set fields removed, or `{"abstain": ...}`
when the call abstained. The reference object is `{"priority", "steps"}` from the label. Code pins the
score in four cases: an abstain scores 0, a reference with steps against no predicted steps scores 0,
a reference `[]` against predicted steps scores 0, and two empty lists score 1. The judge still sees
each of these stops, so that its notes reach GEPA.
"""
from __future__ import annotations

# The fields that code sets on each step. They never reach the judge.
CODE_FIELDS = ("session_id", "author", "confidence", "evidence_quote", "prompt_id")


def get_field(obj: object, name: str, default: object = None) -> object:
    """Read one field from a dict or an attribute-style object."""
    if isinstance(obj, dict):
        return obj.get(name, default)
    return getattr(obj, name, default)


def as_steps(payloads: object) -> list:
    """One step list: a single step dict becomes a one-item list, None becomes []."""
    if payloads is None:
        return []
    if isinstance(payloads, dict):
        return [payloads]
    return list(payloads)


def strip(steps: list) -> list:
    """The steps as the judge sees them: each code-set field removed."""
    return [{key: value for key, value in step.items() if key not in CODE_FIELDS}
            if isinstance(step, dict) else step for step in steps]


def abstain_of(prediction: object) -> dict | None:
    """The abstain of a prediction as a dict, or None when it did not abstain."""
    abstain = get_field(prediction, "abstain")
    if abstain is None or isinstance(abstain, dict):
        return abstain
    return abstain.model_dump()


def predicted_object(prediction: object) -> dict:
    """The predicted payload object that the judge sees."""
    abstain = abstain_of(prediction)
    if abstain is not None:
        return {"abstain": abstain}
    return {"priority": get_field(prediction, "priority"), "steps": strip(as_steps(get_field(prediction, "steps")))}


def reference_object(example: object) -> dict:
    """The reference payload object of a labelled stop. A missing reference raises."""
    steps = get_field(example, "expected_payloads")
    if steps is None:
        raise ValueError("the example has no reference payload (expected_payloads)")
    return {"priority": get_field(example, "priority"), "steps": strip(as_steps(steps))}


def _kind(step: object) -> object:
    """The kind of one step dict, or the step itself when it holds no kind."""
    return get_field(step, "kind", step) if isinstance(step, dict) else step


def pinned(prediction: object, predicted: dict, reference: dict) -> tuple[float, str] | None:
    """The score and note of a case that code pins, or None when the judge score is final."""
    if "abstain" in predicted:
        abstain = predicted["abstain"]
        return (0.0, f"abstain: the call gave no payload ({abstain.get('reason')}: {abstain.get('detail')}).")
    steps, due = predicted["steps"], reference["steps"]
    if due and not steps:
        return (0.0, f"payload: missing, the predicted status is {get_field(prediction, 'status')} "
                     f"and the prediction holds no step where the reference has steps.")
    if steps and not due:
        kinds = ", ".join(str(_kind(step)) for step in steps)
        return (0.0, f"payload: none is due, but the prediction holds {kinds}.")
    if not steps and not due:
        return (1.0, "payload: none is due, and the prediction holds none.")
    return None
