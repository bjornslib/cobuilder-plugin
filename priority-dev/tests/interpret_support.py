"""Helpers for the slice 5 interpreter tests (RED role). The tests never make a live model call.

The contract that these tests pin (the sketches `docs/design/schemas/interpreter_schemas.py` and
`dspy_modules.py` hold the types):

- `priority.interpreter` exports `Interpreter`, `ACTION_KINDS`, and `interpreter_lm`.
  `ACTION_KINDS` is the tuple of the 13 action kinds. `interpreter_lm()` builds the real model from
  `priority.config.load_key()`, and only the CLI calls it.
- `Interpreter(lm=None, *, allowed_kinds=ACTION_KINDS, log_dir=None)` is a `dspy.Module`.
  `forward(brief)` takes the `StopBrief` of slice 4 and returns an Interpretation with the attributes
  `facts`, `advice`, and `abstained`. `abstained` is None unless the run abstains, and then it has
  `reason` and `detail`, and `advice` is None. `advice` has `question` (a Question card or None) and
  `proposal`, and `proposal.steps` is a tuple of one to three actions. Each action has `kind`,
  `author`, `evidence_quote`, `confidence`, and the fields of its kind.
- The calls run in this order: Triage, Pick, one Fill for each step in step order, and Card. Triage
  alone ends a run whose status is `done` with no unsure field. Card runs when `needs_human` is true.
- The DummyLM replies use these output field names. Triage: `status`, `needs_human`, `answer_class`,
  `risk`, `priority_hint`, `unsure`. Pick: `steps`, a JSON list of objects with `kind`,
  `evidence_quote`, and `confidence`. Fill: `payload`, the JSON of the fields that the kind adds to
  the shared ones. Card: `card`, the JSON of a Question.
- A fault in a step gives one Abstain whose `reason` is `quote_not_in_brief` (the quote is empty)
  or `kind_not_allowed`. A quote that is only not in the brief stays in the proposal, and the
  metric ignores the quote text. The text "step N" (N from 1) is in the `detail`. A model call
  that raises gives the reason `model_error`. A reply that does not parse gives the reason
  `invalid_output`. Both write a log record at level INFO or above that holds the reason and the
  error text. No exception escapes.
- `log_dir/calls.jsonl` holds one JSON object for each model call, with the keys `stage` (triage,
  pick, fill, or card), `model_id`, `prompt_hash` (the SHA-256 of `rendered_input`), `rendered_input`,
  and `raw_reply`. A call that raised also has the key `error`.
- `priority interpret <transcript> [--stop N] [--log-dir DIR]` builds the brief, makes the model with
  `priority.interpreter.interpreter_lm()` (called through the module attribute), runs the interpreter,
  and prints one JSON object with the keys `facts`, `advice`, and `abstained`. It exits 0 for an
  Interpretation and for an Abstain. A brief that is an Abstain never reaches the model.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

from brief_support import FIXTURES, build, require
from probe_support import log_reasons, read_calls  # noqa: F401  (re-exported for the tests)

try:  # the root test environment has no dspy. The priority-dev project environment has it
    import dspy
    from dspy.utils import DummyLM
except ImportError:  # the autouse fixture below fails each test with a clear message
    dspy = DummyLM = None

TRANSCRIPT = FIXTURES / "waiting-question.jsonl"

# Exact words from the brief of waiting-question.jsonl. The module test checks that each one is in it.
QUOTE_1 = "Should I retry three times with a fixed delay"
QUOTE_2 = "or use exponential backoff"
QUOTE_3 = "Reply with fixed or backoff"
RUN_QUOTE = "I will read the helper first"
NOT_IN_BRIEF = "words that never appear in the brief"

ALL_KINDS = ("reply", "continue", "continue_until", "approve_permission", "deny_permission", "pick_option",
             "approve_gate", "send_feedback", "interrupt", "ask_human", "snooze", "dismiss", "set_priority_hint",
             "notify")

CARD = {"ask": "Retry with a fixed delay or with backoff?",
        "options": [{"label": "fixed"}, {"label": "backoff"}], "agent_recommendation": "fixed"}


def interpreter_api():
    return require("priority.interpreter")


def make_brief():
    brief = build(TRANSCRIPT)
    text = brief.for_model()
    for quote in (QUOTE_1, QUOTE_2, QUOTE_3, RUN_QUOTE):
        assert quote in text, f"the fixture brief lacks the quote {quote!r}"
    return brief


# ---- DummyLM replies ---------------------------------------------------------

def triage(status="waiting_answer", needs_human=True, answer_class="decide", unsure=()) -> dict:
    return {"status": status, "needs_human": "true" if needs_human else "false", "answer_class": answer_class,
            "risk": "low", "priority_hint": "soon", "unsure": json.dumps(list(unsure))}


DONE = triage(status="done", needs_human=False, answer_class="none")
BLOCKED = triage(status="blocked", needs_human=False, answer_class="approve_continue")


def pick(*steps: tuple) -> dict:
    """Each step is (kind, quote) or (kind, quote, confidence)."""
    return {"steps": json.dumps([{"kind": s[0], "evidence_quote": s[1], "confidence": s[2] if len(s) > 2 else 0.8}
                                 for s in steps])}


def fill(**payload) -> dict:
    return {"payload": json.dumps(payload)}


def card(question: dict = CARD) -> dict:
    return {"card": json.dumps(question)}


PAYLOADS = {
    "reply": {"text": "fixed"},
    "pick_option": {"index": 1},
    "approve_permission": {"scope": "once"},
    "approve_gate": {"gate": "design", "notes": ""},
    "send_feedback": {"notes": "Use backoff."},
    "deny_permission": {"reason": "Too risky."},
    "ask_human": {"detail": {"role": "decide", "questions": [CARD]}, "why_escalated": "A human owns the cost."},
}


def fills_for(kinds) -> list[dict]:
    return [fill(**PAYLOADS[k]) for k in kinds]


def script(status: dict, steps: list[tuple], *, with_card: bool = False, extra_fills=()) -> list[dict]:
    """The replies of a full run: Triage, Pick, one Fill for each step, and Card when asked."""
    replies = [status, pick(*steps), *fills_for([s[0] for s in steps]), *fills_for(extra_fills)]
    return replies + [card()] if with_card else replies


def dummy(replies: list[dict]) -> DummyLM:
    return DummyLM(replies)


class FailingLM(DummyLM or object):
    """A model that raises on the nth call. The calls before it answer from the script."""

    def __init__(self, replies: list[dict], error: Exception, fail_at: int):
        super().__init__(replies)
        self.error, self.fail_at, self.count = error, fail_at, 0

    def forward(self, prompt=None, messages=None, **kwargs):
        self.count += 1
        if self.count == self.fail_at:
            raise self.error
        return super().forward(prompt=prompt, messages=messages, **kwargs)


class RateLimited(RuntimeError):
    pass


# ---- running -----------------------------------------------------------------

def interpret(lm, brief=None, **kwargs):
    api = interpreter_api()
    return api.Interpreter(lm=lm, **kwargs)(brief if brief is not None else make_brief())


def stages(log_dir: Path) -> list[str]:
    return [c["stage"] for c in read_calls(log_dir)]


def fill_kinds(lm: DummyLM) -> list[str]:
    """The kind input of each Fill call, in call order, read from what the model received."""
    found = []
    for entry in lm.history:
        match = re.search(r"\[\[ ## kind ## \]\]\n(\w+)", entry["messages"][-1]["content"])
        if match:
            found.append(match.group(1))
    return found


def step_names_in(abstain) -> set[int]:
    return {int(n) for n in re.findall(r"\bstep (\d)\b", f"{abstain.reason} {abstain.detail}".lower())}


@pytest.fixture(autouse=True)
def no_live_call(monkeypatch):
    """A test that reaches for the real key or the real model fails."""
    assert dspy is not None, "dspy is missing: run the tests in the priority-dev project (uv run --project priority-dev)"
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    config = require("priority.config")

    def refuse():
        raise AssertionError("a test tried to read the OpenRouter key")

    monkeypatch.setattr(config, "load_key", refuse)
