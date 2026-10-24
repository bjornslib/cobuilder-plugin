"""Helpers for the model probe tests. The probe is a script, so the tests load it by path.

The contract that these tests pin for `priority-dev/probes/model_probe.py`:

- `MODEL_ID`: the model id string, `openrouter/mistralai/mistral-nemo`.
- `call_model(prompt: str) -> str`: the one function that reaches the model. It returns the raw
  reply text, and it raises on a failed call. The tests replace it with a stub.
- `run(transcript, *, log_dir=None) -> ProbeResult`: one model call for each run. The model reply is a
  JSON object with the keys `status`, `needs_human`, `answer_class`, `risk`, `priority_hint`, `kind`,
  and `evidence_quote`. `log_dir` holds `calls.jsonl`, one JSON object for each model call.
- `ProbeResult`: the attributes `status`, `needs_human`, `answer_class`, `risk`, `priority_hint`, `kind`,
  `quote`, `quote_in_text`, `abstain_reason`, and `abstain_detail`. `abstain_reason` is None when the
  probe does not abstain.
- `main(argv) -> int`: prints one `name: value` line for each of the first eight attributes.
"""
from __future__ import annotations

import importlib.util
import json
import logging
from pathlib import Path

PRIORITY_DEV = Path(__file__).resolve().parents[1]
PROBE_PATH = PRIORITY_DEV / "probes" / "model_probe.py"
FIXTURES = PRIORITY_DEV / "fixtures" / "made-up"

# Made-up secrets. They match the planted values in fixtures/made-up/with-secret.jsonl.
OPENROUTER_KEY = "sk-or-v1-" + "ab12" * 6
GITHUB_TOKEN = "ghp_" + "Zy9x" * 6
AWS_KEY = "AKIAIOSFODNN7EXAMPLE"
SECRETS = (OPENROUTER_KEY, GITHUB_TOKEN, AWS_KEY)

QUESTION = "Should I retry three times with a fixed delay"
FINAL_TEXT = ("The helper has no retry. Should I retry three times with a fixed delay, "
              "or use exponential backoff? Reply with fixed or backoff.")
ASK_TEXT = "Add a retry to the upload helper."

FACTS = {"status": "waiting_answer", "needs_human": True, "answer_class": "decide",
         "risk": "low", "priority_hint": "soon"}
FACT_NAMES = tuple(FACTS)


def reply(**changes) -> str:
    """A valid model reply as JSON text, with the given keys changed."""
    body = {**FACTS, "kind": "reply", "evidence_quote": QUESTION, **changes}
    return json.dumps(body)


def load_probe():
    assert PROBE_PATH.is_file(), f"the probe script is missing: {PROBE_PATH}"
    spec = importlib.util.spec_from_file_location("model_probe", PROBE_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class StubModel:
    """Stands in for `call_model`. It records each prompt, and it returns or raises as set."""

    def __init__(self, text: str | None = None, error: Exception | None = None):
        self.text, self.error, self.prompts = text, error, []

    def __call__(self, prompt: str) -> str:
        self.prompts.append(prompt)
        if self.error is not None:
            raise self.error
        return self.text


def probe_with(monkeypatch, stub: StubModel):
    """Load the probe, remove any real key, and put the stub in place of the model."""
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    module = load_probe()
    assert callable(getattr(module, "call_model", None)), "the probe has no call_model function"
    monkeypatch.setattr(module, "call_model", stub)
    return module


def read_calls(log_dir: Path) -> list[dict]:
    path = log_dir / "calls.jsonl"
    assert path.is_file(), f"no call log at {path}"
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def log_reasons(caplog) -> str:
    return " ".join(r.getMessage() for r in caplog.records if r.levelno >= logging.INFO)
