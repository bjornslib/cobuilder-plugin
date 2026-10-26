"""Slice 14, notify for a done stop (RED role).

The contract (epic-E5-design.md slice 14, schemas.md section 4):

- `notify` is an action kind: in `ACTION_KINDS`, in `schemas.md`, and in the
  default allowed kinds passed to Pick.
- A stop that Triage calls done gives an Interpretation with exactly one
  `notify` step built by code: no Pick, Fill, or Card model call.
- The excerpt follows the first-guess rule: the first 600 characters of the
  final reply, cut back to the last sentence end. It is an exact part of the
  final reply, never empty.
- An empty final reply gives an Abstain with a stated reason, not an excerpt.
- A Pick step of kind `notify` on a non-done stop is accepted.
- Non-done stops still reach stage 2 exactly as today.

Every test uses DummyLM. No test makes a live model call.
"""
from __future__ import annotations

import json
import re
from types import SimpleNamespace

from brief_support import require, simple
from interpret_support import (BLOCKED, DONE, dspy, dummy, fill, interpret,  # noqa: F401
                               interpreter_api, no_live_call, pick, script, triage)

# ---- the rule under test ----------------------------------------------------

LIMIT = 600


def expected_excerpt(final: str, limit: int = LIMIT) -> str:
    """The slice 14 first-guess rule: the first `limit` characters of the final
    reply, cut back to the last sentence end."""
    head = final[:limit]
    ends = [m.end() for m in re.finditer(r"[.!?]", head)]
    return head[: ends[-1]] if ends else head


SHORT_FINAL = "The fix is done. I merged PR #42."
SENTENCE = "The migration passed on all three replicas with no lag. "
LONG_FINAL = "Done. The deploy is live. " + SENTENCE * 20 + "See the dashboard for graphs."
BOUNDARY_FINAL = "A" * 599 + "." + " The tail stays out of the excerpt."


def done_brief(tmp_path, final: str):
    path = simple(tmp_path / "done.jsonl", ask="Check the logs.", final=final)
    brief = require("priority.brief").build_brief(path, None)
    assert not hasattr(brief, "reason"), f"the brief abstained: {brief!r}"
    assert brief.final == final
    return brief


def history_text(lm) -> str:
    return json.dumps([entry.get("messages", entry) for entry in lm.history], default=str)


# ---- 1. notify is an action kind --------------------------------------------

def test_notify_is_an_action_kind():
    api = interpreter_api()
    assert "notify" in api.ACTION_KINDS, f"ACTION_KINDS lacks notify: {api.ACTION_KINDS!r}"


def test_schemas_md_names_notify():
    from probe_support import PRIORITY_DEV
    text = (PRIORITY_DEV / "docs" / "design" / "schemas.md").read_text()
    assert "`notify`" in text, "schemas.md never names `notify` as an action kind (only `NotifyConfig` exists)"


def test_default_allowed_kinds_include_notify():
    api = interpreter_api()
    assert "notify" in tuple(api.Interpreter(lm=dummy([DONE])).allowed_kinds)


def test_pick_schema_accepts_a_notify_step():
    signatures = require("priority.interpreter.signatures")
    error = None
    try:
        signatures.PickedStep(kind="notify", evidence_quote="The fix is done.", confidence=0.9)
    except Exception as exc:  # noqa: BLE001 (the test must fail on an assertion, not on a raise)
        error = exc
    assert error is None, f"PickedStep refused kind notify: {error!r}"


def test_check_steps_accepts_notify_on_the_default_kinds():
    from priority.interpreter.checks import check_steps
    from priority.interpreter.models import ACTION_KINDS
    step = SimpleNamespace(kind="notify", evidence_quote="The fix is done.", confidence=0.9)
    text = "FINAL REPLY:\nThe fix is done."
    assert check_steps(text, [step], ACTION_KINDS) is None


# ---- 2. a done stop gives one notify step built by code ---------------------

def test_done_stop_gives_exactly_one_notify_step(tmp_path):
    brief = done_brief(tmp_path, SHORT_FINAL)
    lm = dummy([DONE])
    out = interpret(lm, brief)
    assert out.advice is not None, f"a done stop gave no advice: abstained={out.abstained!r}"
    steps = out.advice.proposal.steps
    assert len(steps) == 1, f"a done stop must give one step, gave {len(steps)}"
    assert steps[0].kind == "notify"
    assert steps[0].excerpt == SHORT_FINAL
    assert steps[0].excerpt in brief.final
    assert len(lm.history) == 1, f"a done stop must end after Triage, made {len(lm.history)} calls"


def test_done_stop_excerpt_cuts_a_long_reply_at_a_sentence_end(tmp_path):
    brief = done_brief(tmp_path, LONG_FINAL)
    lm = dummy([DONE])
    out = interpret(lm, brief)
    assert out.advice is not None, f"a done stop gave no advice: abstained={out.abstained!r}"
    excerpt = out.advice.proposal.steps[0].excerpt
    assert excerpt == expected_excerpt(LONG_FINAL)
    assert excerpt in brief.final and excerpt
    assert len(excerpt) <= LIMIT
    assert excerpt[-1] in ".!?"
    assert not re.search(r"[.!?]", LONG_FINAL[len(excerpt):LIMIT])
    assert len(lm.history) == 1


def test_done_stop_excerpt_keeps_a_sentence_end_on_the_600_char_boundary(tmp_path):
    assert LONG_FINAL != BOUNDARY_FINAL  # the two long finals must differ
    assert BOUNDARY_FINAL[LIMIT - 1] == "."
    brief = done_brief(tmp_path, BOUNDARY_FINAL)
    out = interpret(dummy([DONE]), brief)
    assert out.advice is not None, f"a done stop gave no advice: abstained={out.abstained!r}"
    excerpt = out.advice.proposal.steps[0].excerpt
    assert len(excerpt) == LIMIT
    assert excerpt == BOUNDARY_FINAL[:LIMIT]


def test_empty_final_reply_gives_an_abstain_with_a_stated_reason(tmp_path):
    brief = done_brief(tmp_path, "")
    out = interpret(dummy([DONE]), brief)
    assert out.abstained is not None, "an empty final reply must abstain, not give an empty excerpt"
    assert out.abstained.reason == "no_agent_reply"
    assert out.abstained.detail, "the Abstain must state its reason in the detail"
    assert out.advice is None

def test_the_cli_prints_notify_for_a_done_stop(monkeypatch, capsys, tmp_path):
    api = interpreter_api()
    cli = require("priority.cli")
    path = simple(tmp_path / "done.jsonl", ask="Check the logs.", final=SHORT_FINAL)
    lm = dummy([DONE])
    monkeypatch.setattr(api, "interpreter_lm", lambda *a, **k: lm)
    monkeypatch.setattr(cli, "interpreter_lm", lambda *a, **k: lm, raising=False)
    try:
        code = cli.main(["interpret", str(path)])
    except SystemExit as exc:
        code = exc.code
    assert code == 0
    data = json.loads(capsys.readouterr().out)
    assert data.get("abstained") is None
    assert data.get("advice") is not None, f"the CLI gave no advice for a done stop: {data!r}"
    steps = data["advice"]["proposal"]["steps"]
    assert [s["kind"] for s in steps] == ["notify"]
    assert steps[0]["excerpt"] == SHORT_FINAL


def test_non_done_stops_still_reach_pick_and_pick_may_name_notify(tmp_path):
    brief = done_brief(tmp_path, "Fixed the retry bug. Backoff is now the default.")
    quote = "Fixed the retry bug"
    assert quote in brief.for_model()
    lm = dummy(script(BLOCKED, [("reply", quote)]))
    out = interpret(lm, brief)
    assert out.abstained is None, f"a non-done stop must still reach stage 2: {out.abstained!r}"
    assert [s.kind for s in out.advice.proposal.steps] == ["reply"]
    assert len(lm.history) == 3, f"a non-done stop must run Triage, Pick, Fill: {len(lm.history)} calls"
    assert "notify" in history_text(lm), "Pick must receive notify in its allowed kinds"
