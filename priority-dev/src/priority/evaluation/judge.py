"""The judge model grades the raw payload against the expected payload.

The metric calls `judge` with the brief text plus the raw predicted payloads
plus the expected payloads. It returns the final score in 0..1 with one note
per part. Closed fields compare exactly inside the rubric. Open fields compare
by meaning. The default model is the interpreter LM (Inception, with retries
like the optimise path), so a real run works without extra wiring. An
explicit model or the configured dspy model still wins, so the tests keep
their stub seam. Until the real judge model lands, a missing model scores 0.
"""
from __future__ import annotations

import json

import dspy


class JudgePayloads(dspy.Signature):
    """Grade the predicted payload against the expected payload for one stop.

    Return the final score in 0..1 with one note per part, naming the part
    and the match or mismatch."""

    brief_text: str = dspy.InputField(desc="The stop brief text")
    predicted_payloads: str = dspy.InputField(desc="The raw predicted payloads as JSON")
    expected_payloads: str = dspy.InputField(desc="The expected payloads as JSON")
    rubric: str = dspy.InputField(desc="The grading rubric")
    score: float = dspy.OutputField(desc="The final score from 0 to 1")
    notes: list[str] = dspy.OutputField(desc="One note per part")


RUBRIC = ("Grade the predicted payload against the expected payload. Compare "
          "closed fields exactly: kinds, roles, option labels, and other fixed "
          "words must match exactly for full credit. Judge open fields by meaning: "
          "free text that asks the same thing in other words still counts. Return "
          "one note per part.")


def _default_lm() -> dspy.LM:
    """The interpreter LM for the judge, with retries like the optimise path."""
    from priority.interpreter.module import interpreter_lm

    return interpreter_lm(retries=3)


def judge(brief_text: object, predicted_payloads: object,
          expected_payloads: object, lm: dspy.LM | None = None) -> tuple[float, list[str]]:
    """Grade the raw payloads and return the final score with one note per part."""
    try:
        pred_json = json.dumps(predicted_payloads, default=str)
    except Exception:  # noqa: BLE001 (payloads may hold anything, and the judge must not fail)
        pred_json = str(predicted_payloads)
    try:
        exp_json = json.dumps(expected_payloads, default=str)
    except Exception:  # noqa: BLE001 (labels may hold anything, and the judge must not fail)
        exp_json = str(expected_payloads)
    try:
        active = lm if lm is not None else dspy.settings.lm
        if active is None:
            try:
                active = _default_lm()
            except Exception:  # noqa: BLE001 (offline runs score 0, and the stub seam stays)
                return (0.0, ["judge stub: no judge model reached, scored 0"])
        with dspy.context(lm=active):
            out = dspy.Predict(JudgePayloads)(
                brief_text=str(brief_text or ""),
                predicted_payloads=pred_json,
                expected_payloads=exp_json,
                rubric=RUBRIC,
            )
        return (float(out.score), list(out.notes))
    except Exception:  # noqa: BLE001 (no model in offline runs, and the stub scores 0)
        return (0.0, ["judge stub: no judge model reached, scored 0"])
