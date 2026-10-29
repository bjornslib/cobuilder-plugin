"""Helpers for the slice 17 RED tests: the one-call combined variant.

The contract that these tests pin (GREEN picks one spelling):

- `Interpreter(lm, variant="combined", ...)` or `CombinedInterpreter(lm, ...)`.
- Triage runs first; then exactly one model call carries the steps, the
  payloads, and the question card. Tests send every key a combined call may
  read (`steps`, `payloads`, `actions`, `plan`, `result`, `card`,
  `question`), each as a JSON string like the chain replies. A missing or
  JSON-null card means no card.
- Code sets `session_id`, `author`, and `confidence`. The kind and quote
  checks mirror `check_steps`: a bad kind gives `kind_not_allowed`, a quote
  that is not in the brief gives `quote_not_in_brief`, both naming the step,
  and four steps give an Abstain.
- `priority eval --variant combined` scores the same stops with the same
  measure lines as the chain report, plus a contradiction line.

All briefs, labels, and DummyLM replies here are made up. No test makes a
live model call.
"""
from __future__ import annotations

import contextlib
import io
import json

from brief_support import build, require, simple
from fixtures_support import make_labels, make_manifest

SESSION_ID = "combined-session-01"

ASK = "The Willowbank shed needs a coat of teal paint before Friday."
FINAL = "The teal paint is on the shelf. Shall I start with the north wall or the south wall?"
SHORT_FINAL = "The teal paint is on the shelf. Done."
QUOTE_1 = "coat of teal paint"
QUOTE_2 = "north wall or the south wall"
NOT_IN_BRIEF = "purple helicopter hangar"

CARD = {"ask": "Start with the north wall or the south wall?",
        "options": [{"label": "north wall"}, {"label": "south wall"}],
        "agent_recommendation": "north wall"}

REPLY_TEXT = "Starting with the north wall today."

MEASURE_PREFIXES = ("sessions:", "session ", "stop ", "fact status:", "fact needs_human:",
                    "fact answer_class:", "fact risk:", "fact priority_hint:", "steps:",
                    "overall including ambiguous:", "overall excluding ambiguous:",
                    "calls:", "chars sent:")


def interpreter_api():
    return require("priority.interpreter")


def combined_reply(steps: list, card: dict | None = CARD) -> dict:
    """One DummyLM reply holding every key a combined call may read.

    Each step is `(kind, quote, confidence, payload_dict)`. Every value is a
    JSON string, like the chain replies. GREEN reads whichever keys its
    signature uses and ignores the rest.
    """
    step_rows = [{"kind": kind, "evidence_quote": quote, "confidence": confidence}
                 for kind, quote, confidence, _ in steps]
    payload_rows = [payload for _, _, _, payload in steps]
    merged = [{**step, "payload": payload} for step, payload in zip(step_rows, payload_rows)]
    plan = {"actions": merged, "card": card}
    return {"steps": json.dumps(step_rows), "payloads": json.dumps(payload_rows),
            "actions": json.dumps(merged), "plan": json.dumps(plan),
            "result": json.dumps(plan), "card": json.dumps(card),
            "question": json.dumps(card)}


def make_combined(lm, **kwargs):
    """The combined interpreter, or None when neither spelling exists yet."""
    api = interpreter_api()
    if hasattr(api, "CombinedInterpreter"):
        return api.CombinedInterpreter(lm=lm, **kwargs)
    try:
        return api.Interpreter(lm=lm, variant="combined", **kwargs)
    except TypeError:
        return None


def require_combined(lm, **kwargs):
    combo = make_combined(lm, **kwargs)
    assert combo is not None, ("no combined variant yet: add Interpreter(variant='combined') "
                               "or CombinedInterpreter (slice 17)")
    return combo


def make_brief(tmp_path, name: str = "combined.jsonl", ask: str = ASK, final: str = FINAL):
    path = simple(tmp_path / name, ask=ask, final=final)
    brief = build(path)
    assert getattr(brief, "reason", None) is None, f"the made-up brief did not build: {brief!r}"
    return brief


def interpret_chain(lm, brief, **kwargs):
    return interpreter_api().Interpreter(lm=lm, **kwargs)(brief)


def interpret_combined(lm, brief, **kwargs):
    return require_combined(lm, **kwargs)(brief)


def contradiction_api():
    runner = require("priority.evaluation.runner")
    func = getattr(runner, "contradiction_count", None)
    assert func is not None, ("runner has no contradiction_count: it must count predictions whose "
                              "card and first step disagree (slice 17)")
    return func


def prediction_for(out):
    return require("priority.evaluation.runner").to_prediction(out)


def contradiction_case(kind: str = "snooze", with_card: bool = True) -> dict:
    """A hand-made prediction dict with both card-key spellings set."""
    question = {"ask": CARD["ask"]} if with_card else None
    return {"steps": [kind], "quotes": [], "question": question, "card": question, "abstain": None}


EVAL_SESSIONS = [f"combined-made-up-{index:02d}" for index in range(1, 11)]


def write_combined_world(tmp_path):
    """A made-up manifest, labels, and one-stop transcripts with invented text."""
    require("priority.evaluation.split")
    from eval_support import with_payloads
    from priority.evaluation.split import split

    manifest_path = tmp_path / "set-manifest.json"
    labels_path = tmp_path / "labels-confirmed.json"
    real_dir = tmp_path / "real"
    real_dir.mkdir(exist_ok=True)
    manifest_path.write_text(json.dumps(make_manifest(EVAL_SESSIONS, 1), indent=2) + "\n")
    labels = with_payloads(make_labels(EVAL_SESSIONS, 1), [])
    labels_path.write_text(json.dumps(labels, indent=2) + "\n")
    for session_id in EVAL_SESSIONS:
        simple(real_dir / f"{session_id}.jsonl", ask=ASK, final=FINAL)
    return manifest_path, labels_path, real_dir, split(list(EVAL_SESSIONS))


def run_eval_variant(monkeypatch, tmp_path, args: list) -> tuple:
    """Run `priority eval` in process with a recording stub interpreter.

    Return `(code, printed, parts, recorded_kwargs)`. Before GREEN, an unknown
    `--variant` flag exits through SystemExit, so `code` is None and the
    caller fails on `assert code == 0`, not on the missing flag.
    """
    require("priority.evaluation.metric")
    interpreter = require("priority.interpreter")
    config = require("priority.config")
    from eval_support import StubInterpreter, stub_predictions_for

    manifest_path, labels_path, real_dir, parts = write_combined_world(tmp_path)
    monkeypatch.setattr(config, "load_key",
                        lambda *args, **kwargs: (_ for _ in ()).throw(
                            AssertionError("a test reached for the real key")))
    recorded = []

    def factory(*args, **kwargs):
        recorded.append(kwargs)
        return StubInterpreter(stub_predictions_for(manifest_path, labels_path))

    monkeypatch.setattr(interpreter, "Interpreter", factory)
    from priority.cli import main

    code, out = None, io.StringIO()
    with contextlib.suppress(SystemExit):
        with contextlib.redirect_stdout(out):
            code = main(["eval", *args, "--manifest", str(manifest_path),
                         "--labels", str(labels_path), "--real-dir", str(real_dir),
                         "--log-dir", str(tmp_path / "logs")])
    return code, out.getvalue(), parts, recorded
