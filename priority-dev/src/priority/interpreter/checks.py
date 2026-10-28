"""The code checks on the steps that Pick returns. No model runs here."""
from __future__ import annotations

from collections.abc import Sequence

from priority.interpreter.models import Abstain

MAX_STEPS = 3

def check_steps(text: str, picked: Sequence, allowed_kinds: Sequence[str]) -> Abstain | None:
    """The Abstain for the first step that fails a check, or None when each step passes.

    A quote that is not in the brief is not a check fault: the step stays in
    the proposal and the metric ignores the quote text. Only an empty quote
    still abstains the whole stop."""
    if not 1 <= len(picked) <= MAX_STEPS:
        return Abstain(reason="invalid_output",
                       detail=f"Pick returned {len(picked)} steps, and a proposal holds one to {MAX_STEPS}")
    for number, step in enumerate(picked, start=1):
        if step.kind not in allowed_kinds:
            return Abstain(reason="kind_not_allowed", detail=f"step {number}: the kind {step.kind} is not allowed")
        if step.kind == "ask_human":
            continue  # a human task needs no quote
        if not step.evidence_quote:
            return Abstain(reason="quote_not_in_brief", detail=f"step {number}: the quote is empty")
    return None


def check_fill_payload(kind: str, payload: object) -> Abstain | None:
    """The Abstain when an ask_human payload holds no questions, else None."""
    if kind != "ask_human":
        return None
    detail = getattr(payload, "detail", None)
    if detail is None and isinstance(payload, dict):
        detail = payload.get("detail")
    role = getattr(detail, "role", None) if detail is not None else None
    if isinstance(detail, dict):
        role = detail.get("role")
    if role is not None and role != "decide":
        return None
    questions = getattr(detail, "questions", None) if detail is not None else None
    if isinstance(detail, dict):
        questions = detail.get("questions")
    if not questions:
        return Abstain(reason="invalid_output",
                       detail="ask_human holds no questions: a decide step needs at least one question")
    return None
