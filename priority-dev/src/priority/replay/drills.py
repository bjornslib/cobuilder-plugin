"""The four failure drills. Each one runs the Interpreter on a scripted model that fails in one way."""
from __future__ import annotations

import json
from pathlib import Path

import litellm
from dspy.utils import DummyLM

from priority.brief import StopBrief
from priority.interpreter import Interpreter
from priority.replay.store import log_abstain

TRIAGE = {"status": "waiting_answer", "needs_human": "true", "answer_class": "decide", "risk": "low",
          "priority_hint": "soon", "unsure": "[]"}
PICK_MALFORMED = {"steps": "this is not JSON"}
PICK_EMPTY_QUOTE = {"steps": json.dumps([{"kind": "reply", "evidence_quote": "", "confidence": 0.8}])}
FOLDER = "drills"


class FaultyModel(DummyLM):
    """A scripted model. It answers Triage, and then it raises `error` or returns the Pick reply `pick`."""

    def __init__(self, error: Exception | None = None, pick: dict | None = None):
        super().__init__([TRIAGE, pick or {}])
        self.error, self.calls = error, 0

    def forward(self, prompt=None, messages=None, **kwargs):
        self.calls += 1
        if self.calls == 2 and self.error is not None:  # the second call is Pick
            raise self.error
        return super().forward(prompt=prompt, messages=messages, **kwargs)


def drills() -> dict[str, FaultyModel]:
    limit = litellm.RateLimitError("429 Too Many Requests", llm_provider="openrouter", model="drill")
    return {"rate_limit": FaultyModel(error=limit), "malformed_json": FaultyModel(pick=PICK_MALFORMED),
            "empty_quote": FaultyModel(pick=PICK_EMPTY_QUOTE),
            "timeout": FaultyModel(error=TimeoutError("the model timed out"))}


def run_drills(session: str, brief: StopBrief, log_dir: Path) -> dict[str, str]:
    """Run each drill on the brief. Returns the Abstain reason of each drill. An end with no Abstain says so."""
    found = {}
    for name, model in drills().items():
        result = Interpreter(model, log_dir=log_dir / FOLDER, session_id=session)(brief)
        abstain = result.abstained
        found[name] = abstain.reason if abstain else "no abstain"
        if abstain:
            log_abstain(f"{session} (drill {name})", abstain.reason, abstain.detail)
    return found

