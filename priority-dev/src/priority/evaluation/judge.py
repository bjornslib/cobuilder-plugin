"""The judge model grades the predicted payload object against the reference payload object.

The metric calls `judge` with the brief text plus the predicted object plus
the reference object. Each object holds a `priority` and a list of `steps`,
with the code-set fields already removed. For an abstain, the predicted object
holds the abstain with the raw reply and the error text. The judge returns
the final score in 0..1 with one note per part. The judge grades only
the fields that the reference states. Closed fields compare exactly inside
the rubric. Open fields compare by meaning. The default model is the NVIDIA
Mistral judge (see `judge_lm`), so a real run works without extra wiring.
An explicit model or the configured dspy model still wins, so the tests keep
their stub seam. A missing model scores 0. `USAGE` counts each judge model
call and its tokens, and `usage_line` reports the totals. The price per token
is not known, so the meter holds tokens only.
"""
from __future__ import annotations

import hashlib
import json
import threading

import dspy


class JudgePayloads(dspy.Signature):
    """Grade the predicted payload against the expected payload for one stop.

    Return the final score in 0..1 with one note per part, naming the part
    and the match or mismatch."""

    brief_text: str = dspy.InputField(desc="The stop brief text")
    predicted_payloads: str = dspy.InputField(
        desc="The predicted payload object as JSON: priority and steps, or an abstain with the raw reply and the error")
    expected_payloads: str = dspy.InputField(desc="The reference payload object as JSON: priority and steps")
    rubric: str = dspy.InputField(desc="The grading rubric")
    score: float = dspy.OutputField(desc="The final score from 0 to 1")
    notes: list[str] = dspy.OutputField(desc="One note per part")


RUBRIC = ("Grade the predicted payload against the reference payload. Each is an "
          "object with a priority (P1, P2, or P3) and a list of steps. Grade only "
          "the fields that the reference states, and ignore extra fields in the "
          "prediction. The order of questions does not count. Compare closed fields "
          "exactly: priority, kind, role, multi_select, free_text, option labels, "
          "until_event, and scope must match exactly for full credit. A wrong "
          "priority loses credit even when the steps match. Judge open text by "
          "meaning: free text that asks the same thing in other words still counts. "
          "When the prediction is an abstain, it holds the raw reply of the model "
          "and the validation error in place of a payload. Then say in your notes "
          "what the model must change so that its reply parses and validates, and "
          "how its meaning differs from the reference. Return one note per part, "
          "each note one short sentence.")

# The judge writes one note per part. A cap of 3000 tokens cut its reply on a two-question payload, and 8000 cut
# two replies in one judge-check run. A cut reply does not parse. Mercury 3 allows 131072 output tokens.
JUDGE_MAX_TOKENS = 16000


# The version of the rules that turn a judge reply into a score. Change it when code pins a case again or
# stops, so that a checkpoint row of the old rules is not reused.
SCORING = "unpinned-v1"


def judge_identity() -> dict:
    """What one judge run depends on: the model, the endpoint, the temperature,
    the token cap, the rubric, and the scoring version. It never reads a key.

    A checkpoint row of a run with another identity must not be reused, so
    `judge-check` stores this dict in each row and compares it on load. The
    rubric enters as a SHA-256 digest, so the row stays short."""
    from priority import config

    identity = {"model": config.judge_model(), "base_url": config.judge_base_url(),
                "temperature": config.judge_temperature(), "max_tokens": JUDGE_MAX_TOKENS,
                "rubric": hashlib.sha256(RUBRIC.encode()).hexdigest(), "scoring": SCORING}
    effort = config.judge_reasoning_effort()
    if effort is not None:  # unset keeps the old identity, so old checkpoint rows stay valid
        identity["reasoning_effort"] = effort
    return identity

USAGE = {"calls": 0, "prompt_tokens": 0, "completion_tokens": 0}
_USAGE_LOCK = threading.Lock()  # eval scores stops from worker threads, so the totals need a lock


def reset_usage() -> None:
    """Set the judge call and token counts back to zero."""
    with _USAGE_LOCK:
        for name in USAGE:
            USAGE[name] = 0


def usage_line() -> str:
    """The judge call and token totals as one report line."""
    return (f"judge calls: {USAGE['calls']} prompt_tokens: {USAGE['prompt_tokens']} "
            f"completion_tokens: {USAGE['completion_tokens']}")


def _meter(lm: dspy.LM, before: int) -> None:
    """Add one call, and the tokens of the history entry that this call added."""
    with _USAGE_LOCK:
        USAGE["calls"] += 1
        history = getattr(lm, "history", None) or []
        if len(history) <= before:
            return
        usage = history[-1].get("usage") or {}
        for name in ("prompt_tokens", "completion_tokens"):
            USAGE[name] += int(usage.get(name) or 0)


def judge_lm(retries: int = 3) -> dspy.LM:
    """The judge model. The default is the NVIDIA Mistral model, not the task model, so the judge does not prefer its own family."""
    from priority import config

    extra = {}
    effort = config.judge_reasoning_effort()
    if effort is not None:  # unset passes nothing, so the call stays as it was
        extra["reasoning_effort"] = effort
    return dspy.LM(config.judge_model(), api_key=config.judge_key(), api_base=config.judge_base_url(),
                   temperature=config.judge_temperature(), max_tokens=JUDGE_MAX_TOKENS, timeout=120,
                   num_retries=retries, cache=False, **extra)


def _default_lm() -> dspy.LM:
    """The judge LM, with retries like the optimise path."""
    return judge_lm(retries=3)


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
    active = lm if lm is not None else dspy.settings.lm
    if active is None:
        try:
            active = _default_lm()
        except Exception:  # noqa: BLE001 (offline runs score 0, and the stub seam stays)
            return (0.0, ["judge stub: no judge model reached, scored 0"])
    if isinstance(active, dspy.LM):
        active = active.copy(max_tokens=JUDGE_MAX_TOKENS)
    before = len(getattr(active, "history", None) or [])
    try:
        with dspy.context(lm=active):
            out = dspy.Predict(JudgePayloads)(
                brief_text=str(brief_text or ""),
                predicted_payloads=pred_json,
                expected_payloads=exp_json,
                rubric=RUBRIC,
            )
        score, notes = float(out.score), list(out.notes)
    except Exception as error:  # noqa: BLE001 (a failed judge call must not fail the metric)
        _meter(active, before)
        return (0.0, [f"judge error: the judge call failed ({type(error).__name__}), scored 0"])
    _meter(active, before)
    return (score, notes)
