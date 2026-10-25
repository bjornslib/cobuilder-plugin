"""Helpers for the model probe tests. The probe is a script, so the tests load it by path.

The contract that these tests pin for `priority-dev/probes/model_probe.py`:

- `INTERPRETER_MODEL` is `openrouter/deepseek/deepseek-v4.1-flash-1017`. `DIGEST_MODEL` is
  `openrouter/thinkingmachines/inkling-small`. The probe has no `MODEL_ID`.
- `call_model(prompt: str, model=INTERPRETER_MODEL)`: the one function that reaches a model. It returns
  a str, or a dict with the keys `text` and `reasoning_content`, and it raises on a failed call. The
  tests replace it with a stub. Any other reply shape ends as an Abstain `invalid_output`.
- `run(transcript, *, model=INTERPRETER_MODEL, log_dir=None) -> ProbeResult`: one model call for each
  transcript. The model text is a JSON object with the keys `status`, `needs_human`, `answer_class`,
  `risk`, `priority_hint`, `kind`, and `evidence_quote`. `log_dir` holds `calls.jsonl`, one JSON object
  for each model call, with the keys `model_id`, `prompt_hash`, `prompt`, `raw_reply`, `reasoning`, and
  `error` (on failure).
- `repeat(transcript, n, *, model=INTERPRETER_MODEL, log_dir=None) -> list[ProbeResult]`: n calls.
- `agreement(results) -> dict`: for the five facts and `kind`, the share of results that hold the most
  common value. An Abstain counts as the value `abstain`.
- `ProbeResult`: the attributes `status`, `needs_human`, `answer_class`, `risk`, `priority_hint`, `kind`,
  `quote`, `quote_in_text`, `abstain_reason`, and `abstain_detail`. `abstain_reason` is None when the
  probe does not abstain.
- `main(argv) -> int`: prints one `name: value` line for each of the first eight attributes. With
  `--repeat N` above 1, it also prints `agreement: <field>=<share>` for each of the six fields.
  `--model interpreter|digest` picks the model.
"""
from __future__ import annotations

import importlib.util
import json
import logging
from pathlib import Path

PRIORITY_DEV = Path(__file__).resolve().parents[1]
PROBE_PATH = PRIORITY_DEV / "probes" / "model_probe.py"
FIXTURES = PRIORITY_DEV / "fixtures" / "made-up"

INTERPRETER_MODEL = "openrouter/deepseek/deepseek-v4.1-flash-1017"
DIGEST_MODEL = "openrouter/thinkingmachines/inkling-small"

# Made-up secrets. They match the planted values in fixtures/made-up/with-secret.jsonl.
OPENROUTER_KEY = "sk-or-v1-" + "ab12" * 6
GITHUB_TOKEN = "ghp_" + "Zy9x" * 6
AWS_KEY = "AKIAIOSFODNN7EXAMPLE"
SECRETS = (OPENROUTER_KEY, GITHUB_TOKEN, AWS_KEY)

QUESTION = "Should I retry three times with a fixed delay"
FINAL_TEXT = ("The helper has no retry. Should I retry three times with a fixed delay, "
              "or use exponential backoff? Reply with fixed or backoff.")
ASK_TEXT = "Add a retry to the upload helper."

# The text of fixtures/made-up/synthetic-tail.jsonl. It ends on a `<synthetic>` assistant record.
TAIL_ASK_TEXT = "Rename the config key timeout to timeout_seconds."
TAIL_FINAL_TEXT = ("I renamed the key in three files. "
                   "Should I also update the sample config in the docs folder?")
TAIL_QUOTE = "Should I also update the sample config in the docs folder"
TAIL_SYNTHETIC_TEXT = "No response requested."

FACTS = {"status": "waiting_answer", "needs_human": True, "answer_class": "decide",
         "risk": "low", "priority_hint": "soon"}
FACT_NAMES = tuple(FACTS)
AGREEMENT_FIELDS = (*FACT_NAMES, "kind")

UNSET = object()


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
    """Stands in for `call_model`. It records each prompt and model, and it returns or raises as set.

    `text` is the one reply for every call. It may be any shape, None included. `replies` is a list of
    replies for successive calls, and the last one repeats. `error` makes every call raise.
    """

    def __init__(self, text=UNSET, error: Exception | None = None, replies: list | None = None):
        self.text, self.error, self.replies = text, error, replies
        self.prompts: list[str] = []
        self.models: list = []

    def __call__(self, prompt: str, model=None):
        self.prompts.append(prompt)
        self.models.append(model)
        if self.error is not None:
            raise self.error
        if self.replies is not None:
            return self.replies[min(len(self.prompts), len(self.replies)) - 1]
        assert self.text is not UNSET, "the stub has no reply set"
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
