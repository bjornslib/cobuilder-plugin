"""The four failure drills. Each one runs the Interpreter on a scripted model that fails in one way."""
from __future__ import annotations

import json
from pathlib import Path

import litellm
from dspy.utils import DummyLM

from priority.brief import StopBrief
from priority.interpreter import Interpreter
from priority.replay.store import log_abstain

BASE = {"status": "waiting_answer", "needs_human": "true", "priority": "P2"}
MALFORMED = BASE | {"steps": "this is not JSON"}
UNKNOWN_KIND = BASE | {"steps": json.dumps([{"kind": "launch_missile"}])}
FOLDER = "drills"


class FaultyModel(DummyLM):
    """A scripted model. Its one call raises `error`, or it returns the ProposeStop reply `reply`."""

    def __init__(self, error: Exception | None = None, reply: dict | None = None):
        super().__init__([reply or {}])
        self.error = error

    def forward(self, prompt=None, messages=None, **kwargs):
        if self.error is not None:
            raise self.error
        return super().forward(prompt=prompt, messages=messages, **kwargs)


def drills() -> dict[str, FaultyModel]:
    limit = litellm.RateLimitError("429 Too Many Requests", llm_provider="openrouter", model="drill")
    return {"rate_limit": FaultyModel(error=limit), "malformed_json": FaultyModel(reply=MALFORMED),
            "unknown_kind": FaultyModel(reply=UNKNOWN_KIND),
            "timeout": FaultyModel(error=TimeoutError("the model timed out"))}


def run_drills(session: str, brief: StopBrief, log_dir: Path) -> dict[str, str]:
    """Run each drill on the brief. Returns the Abstain reason of each drill. An end with no Abstain says so."""
    found = {}
    for name, model in drills().items():
        result = Interpreter(model, log_dir=log_dir / FOLDER, session_id=session)(brief_text=brief.for_model())
        abstain = result.abstain
        found[name] = abstain["reason"] if abstain else "no abstain"
        if abstain:
            log_abstain(f"{session} (drill {name})", abstain["reason"], abstain["detail"])
    return found
