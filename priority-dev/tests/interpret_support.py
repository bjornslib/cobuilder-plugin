"""Helpers for the interpreter tests: one typed call (slice 21, RED role). No test makes a live model call.

The contract that these helpers serve (design: `probes/program-flow-v2.svg`):

- `priority.interpreter.signatures.ProposeStop` takes `brief_text` and returns `status`, `needs_human`,
  `steps` (0 to 3 steps, discriminated on `kind` over the payload models of 13 action kinds), and
  `priority` (P1, P2, or P3). No step schema holds a code-set field.
- `Interpreter(lm=None, *, log_dir=None, session_id="", adapter="chat")` is a `dspy.Module` with one
  predictor, `propose`. `forward(brief_text=...)` makes one model call and returns a `dspy.Prediction`
  with `status`, `needs_human`, `priority`, `steps` (dicts, where code sets `session_id` and `author`),
  and `abstain` (None, or a dict with `reason`, `detail`, and `raw`).
- The DummyLM replies use the output names of ProposeStop. `steps` is the JSON text of the step list.
"""
from __future__ import annotations

import itertools
import json
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
SESSION_ID = "made-up-session"

KINDS = ("reply", "continue", "continue_until", "approve_permission", "deny_permission", "pick_option",
         "approve_gate", "send_feedback", "interrupt", "ask_human", "snooze", "dismiss", "notify")
CODE_FIELDS = ("session_id", "author", "confidence", "evidence_quote", "prompt_id")
STATUSES = ("done", "waiting_answer", "waiting_permission", "blocked", "failed", "continuing")

CARD = {"ask": "Retry with a fixed delay or with backoff?",
        "options": [{"label": "fixed"}, {"label": "backoff"}], "agent_recommendation": "fixed"}

# The smallest valid payload of each kind, with no code-set field.
PAYLOADS = {
    "reply": {"text": "fixed"},
    "continue": {},
    "continue_until": {"goal": "Finish the retry loop.", "proof": {"kind": "agent_shows", "show": "the tests pass"},
                       "max_turns": 5, "max_minutes": 30},
    "approve_permission": {"scope": "once"},
    "deny_permission": {"reason": "Too risky."},
    "pick_option": {"index": 1},
    "approve_gate": {"gate": "design", "notes": ""},
    "send_feedback": {"notes": "Use backoff."},
    "interrupt": {},
    "ask_human": {"detail": {"role": "decide", "questions": [CARD]}, "why_escalated": "A human owns the cost."},
    "snooze": {"until_event": "turn_end"},
    "dismiss": {"reason": "done"},
    "notify": {"excerpt": "The fix is done."},
}


def interpreter_api():
    return require("priority.interpreter")


def make_brief():
    return build(TRANSCRIPT)


def step(kind: str, **changes) -> dict:
    """One step dict as the model writes it: the kind and its payload fields."""
    return {"kind": kind, **json.loads(json.dumps(PAYLOADS.get(kind, {}))), **changes}


# ---- DummyLM replies ---------------------------------------------------------

def propose(steps=(), *, status: str = "waiting_answer", needs_human: bool = True, priority: str = "P2",
            **raw) -> dict:
    """One ProposeStop reply. A keyword in `raw` replaces the text of that field as it is."""
    reply = {"status": status, "needs_human": "true" if needs_human else "false",
             "steps": steps if isinstance(steps, str) else json.dumps(list(steps)), "priority": priority}
    return reply | raw


DONE = propose([], status="done", needs_human=False, priority="P3")


def dummy(replies: list[dict]) -> DummyLM:
    return DummyLM(replies)


class Always(DummyLM or object):
    """A model that gives the same reply to every call."""

    def __init__(self, reply: dict):
        super().__init__([])
        self.answers = itertools.repeat(reply)


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
    """Run the Interpreter on the brief text of one stop. Return what forward returns."""
    text = (brief if brief is not None else make_brief()).for_model()
    return interpreter_api().Interpreter(lm=lm, **kwargs)(brief_text=text)


def predicted(lm, brief=None, **kwargs):
    """Run the Interpreter, and fail on an assertion when forward returns no dspy.Prediction."""
    out = interpret(lm, brief, **kwargs)
    assert isinstance(out, dspy.Prediction), f"forward returned {type(out).__name__}, not a dspy.Prediction"
    return out


def stages(log_dir: Path) -> list[str]:
    return [c["stage"] for c in read_calls(log_dir)]


@pytest.fixture(autouse=True)
def no_live_call(monkeypatch):
    """A test that reaches for the real key or the real model fails."""
    assert dspy is not None, "dspy is missing: run the tests in the priority-dev project (uv run --project priority-dev)"
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    config = require("priority.config")

    def refuse():
        raise AssertionError("a test tried to read the OpenRouter key")

    monkeypatch.setattr(config, "load_key", refuse)
