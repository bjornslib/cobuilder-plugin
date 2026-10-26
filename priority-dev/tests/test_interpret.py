"""Slice 5, interpret a stop (RED role).

The contract is in interpret_support.py and in dspy-modules.md section 3. Every test uses DummyLM.
1. Module exports
2. The valid path, the card, and the done path
3. Steps: one to three, one Fill for each, in order
4. The checks of kind and quote, and the step number
5. Failures end as an Abstain with a logged reason
6. The call store
7. The CLI
"""
from __future__ import annotations

import hashlib
import json
import logging

import pytest

from interpret_support import (ALL_KINDS, dspy, BLOCKED, CARD, DONE, NOT_IN_BRIEF, QUOTE_1, QUOTE_2, QUOTE_3,
                               RUN_QUOTE, FailingLM, RateLimited, dummy, fill, fill_kinds,
                               interpret, interpreter_api, log_reasons, make_brief, no_live_call,  # noqa: F401
                               pick, read_calls, script, stages, step_names_in, triage)
from brief_support import FIXTURES, require


# ---- 1. Module exports --------------------------------------------------------

def test_interpreter_module_exports():
    api = interpreter_api()
    assert tuple(sorted(api.ACTION_KINDS)) == tuple(sorted(ALL_KINDS))
    assert len(api.ACTION_KINDS) == 14
    assert callable(api.interpreter_lm)
    assert issubclass(api.Interpreter, dspy.Module)


# ---- 2. The valid path, the card, and the done path ---------------------------

def test_valid_one_step_path_with_a_question_card():
    lm = dummy(script(triage(), [("reply", QUOTE_1)], with_card=True))
    out = interpret(lm)
    assert out.abstained is None
    assert out.facts.status == "waiting_answer"
    assert out.facts.needs_human is True
    steps = out.advice.proposal.steps
    assert len(steps) == 1
    step = steps[0]
    assert step.kind == "reply"
    assert step.text == "fixed"
    assert step.evidence_quote == QUOTE_1
    assert step.author == "interpreter"
    assert step.confidence == pytest.approx(0.8)
    assert out.advice.question.ask == CARD["ask"]
    assert [o.label for o in out.advice.question.options] == ["fixed", "backoff"]
    assert len(lm.history) == 4


def test_no_card_when_no_human_must_answer():
    lm = dummy(script(BLOCKED, [("reply", QUOTE_1)]))
    out = interpret(lm)
    assert out.abstained is None
    assert out.advice.question is None
    assert out.advice.proposal.steps[0].kind == "reply"
    assert len(lm.history) == 3


def test_done_status_gives_one_code_built_notify_step():
    lm = dummy([DONE])
    out = interpret(lm)
    assert out.facts.status == "done"
    assert out.abstained is None
    assert [s.kind for s in out.advice.proposal.steps] == ["notify"]
    final = make_brief().final
    step = out.advice.proposal.steps[0]
    assert step.excerpt and step.excerpt in final and len(step.excerpt) <= 600
    assert len(lm.history) == 1


def test_an_unsure_field_sends_a_done_status_on_to_pick():
    lm = dummy(script(triage(status="done", needs_human=False, answer_class="none", unsure=["status"]),
                      [("reply", QUOTE_1)]))
    out = interpret(lm)
    assert out.advice.proposal.steps[0].kind == "reply"
    assert len(lm.history) == 3


# ---- 3. Steps: one to three, one Fill for each, in order ----------------------

STEP_SETS = {
    "one": [("reply", QUOTE_1)],
    "two": [("reply", QUOTE_1), ("pick_option", QUOTE_2)],
    "three": [("reply", QUOTE_1), ("pick_option", QUOTE_2), ("send_feedback", QUOTE_3)],
}


@pytest.mark.parametrize("steps", STEP_SETS.values(), ids=STEP_SETS.keys())
def test_one_fill_for_each_step_in_step_order(tmp_path, steps):
    lm = dummy(script(BLOCKED, steps))
    out = interpret(lm, log_dir=tmp_path)
    assert out.abstained is None
    kinds = [s[0] for s in steps]
    assert [s.kind for s in out.advice.proposal.steps] == kinds
    assert fill_kinds(lm) == kinds
    assert stages(tmp_path) == ["triage", "pick", *["fill"] * len(steps)]
    assert len(lm.history) == 2 + len(steps)


def test_three_step_proposal_keeps_each_payload_and_quote_with_its_step():
    lm = dummy(script(BLOCKED, STEP_SETS["three"]))
    steps = interpret(lm).advice.proposal.steps
    assert [s.evidence_quote for s in steps] == [QUOTE_1, QUOTE_2, QUOTE_3]
    assert steps[0].text == "fixed"
    assert steps[1].index == 1
    assert steps[2].notes == "Use backoff."


def test_four_steps_give_an_abstain():
    four = [("reply", QUOTE_1), ("pick_option", QUOTE_2), ("reply", QUOTE_3), ("reply", RUN_QUOTE)]
    out = interpret(dummy(script(BLOCKED, four)))
    assert out.advice is None
    assert out.abstained is not None
    assert out.abstained.reason
    assert out.abstained.reason not in ("quote_not_in_brief", "kind_not_allowed")


def test_zero_steps_give_an_abstain():
    out = interpret(dummy([BLOCKED, pick()]))
    assert out.advice is None
    assert out.abstained is not None
    assert out.abstained.reason


# ---- 4. The checks of kind and quote ------------------------------------------

def test_quote_not_in_brief_gives_an_abstain():
    lm = dummy(script(BLOCKED, [("reply", NOT_IN_BRIEF)]))
    out = interpret(lm)
    assert out.advice is None
    assert out.abstained.reason == "quote_not_in_brief"
    assert step_names_in(out.abstained) == {1}
    assert out.facts.status == "blocked"


def test_kind_not_allowed_gives_an_abstain():
    lm = dummy(script(BLOCKED, [("approve_permission", QUOTE_1)]))
    out = interpret(lm, allowed_kinds=("reply", "continue"))
    assert out.advice is None
    assert out.abstained.reason == "kind_not_allowed"
    assert step_names_in(out.abstained) == {1}


def test_allowed_kinds_reach_the_pick_call():
    lm = dummy(script(BLOCKED, [("reply", QUOTE_1)]))
    interpret(lm, allowed_kinds=("reply", "snooze"))
    pick_input = lm.history[1]["messages"][-1]["content"]
    assert "reply" in pick_input and "snooze" in pick_input
    assert "approve_gate" not in pick_input


FAULTS = {
    "quote in step 1": ([("reply", NOT_IN_BRIEF), ("pick_option", QUOTE_2)], "quote_not_in_brief", 1),
    "quote in step 2": ([("reply", QUOTE_1), ("pick_option", NOT_IN_BRIEF)], "quote_not_in_brief", 2),
    "quote in step 3": ([("reply", QUOTE_1), ("pick_option", QUOTE_2), ("reply", NOT_IN_BRIEF)],
                        "quote_not_in_brief", 3),
    "kind in step 1": ([("approve_gate", QUOTE_1), ("reply", QUOTE_2)], "kind_not_allowed", 1),
    "kind in step 2": ([("reply", QUOTE_1), ("approve_gate", QUOTE_2)], "kind_not_allowed", 2),
    "kind in step 3": ([("reply", QUOTE_1), ("pick_option", QUOTE_2), ("approve_gate", QUOTE_3)],
                       "kind_not_allowed", 3),
}


@pytest.mark.parametrize("steps,reason,number", FAULTS.values(), ids=FAULTS.keys())
def test_a_fault_names_its_step(steps, reason, number):
    allowed = ("reply", "pick_option", "send_feedback")
    out = interpret(dummy(script(BLOCKED, steps)), allowed_kinds=allowed)
    assert out.advice is None
    assert out.abstained.reason == reason
    assert step_names_in(out.abstained) == {number}


def test_the_first_faulty_step_is_the_one_named():
    steps = [("reply", QUOTE_1), ("pick_option", NOT_IN_BRIEF), ("approve_gate", QUOTE_3)]
    out = interpret(dummy(script(BLOCKED, steps)), allowed_kinds=("reply", "pick_option"))
    assert step_names_in(out.abstained) == {2}


def test_a_fault_in_a_later_step_gives_no_proposal_for_the_good_steps():
    steps = [("reply", QUOTE_1), ("pick_option", NOT_IN_BRIEF)]
    out = interpret(dummy(script(BLOCKED, steps)))
    assert out.advice is None
    assert out.abstained is not None


def test_an_empty_quote_gives_an_abstain_for_a_session_kind():
    out = interpret(dummy(script(BLOCKED, [("reply", "")])))
    assert out.advice is None
    assert out.abstained.reason in ("quote_not_in_brief", "empty_quote")
    assert step_names_in(out.abstained) == {1}


def test_ask_human_needs_no_quote():
    lm = dummy(script(triage(needs_human=True), [("ask_human", "")], with_card=True))
    out = interpret(lm)
    assert out.abstained is None
    step = out.advice.proposal.steps[0]
    assert step.kind == "ask_human"
    assert step.evidence_quote == ""
    assert step.detail.role == "decide"
    assert step.detail.question.ask == CARD["ask"]


def test_ask_human_after_a_session_step_keeps_both():
    lm = dummy(script(BLOCKED, [("reply", QUOTE_1), ("ask_human", "")]))
    steps = interpret(lm).advice.proposal.steps
    assert [s.kind for s in steps] == ["reply", "ask_human"]


def test_code_sets_the_author_and_the_model_cannot_forge_it():
    replies = [BLOCKED, pick(("reply", QUOTE_1)), fill(text="fixed", author="human", session_id="forged")]
    out = interpret(dummy(replies))
    if out.abstained is None:
        assert all(s.author == "interpreter" and s.session_id != "forged" for s in out.advice.proposal.steps)
    else:
        assert out.abstained.reason == "invalid_output"


# ---- 5. Failures end as an Abstain with a logged reason -----------------------

CALLS = {"triage": 1, "pick": 2, "fill": 3, "card": 4}
ERRORS = {
    "rate limit": RateLimited("429 Too Many Requests"),
    "server error": RuntimeError("503 upstream unavailable"),
    "timeout": TimeoutError("the model timed out"),
}


@pytest.mark.parametrize("error", ERRORS.values(), ids=ERRORS.keys())
@pytest.mark.parametrize("stage,call", CALLS.items(), ids=CALLS.keys())
def test_a_model_failure_gives_an_abstain_and_a_log(caplog, stage, call, error):
    caplog.set_level(logging.INFO)
    lm = FailingLM(script(triage(), [("reply", QUOTE_1)], with_card=True), error, fail_at=call)
    out = interpret(lm)
    assert out.advice is None
    assert out.abstained.reason == "model_error"
    assert str(error) in out.abstained.detail or str(error) in log_reasons(caplog)
    assert "model_error" in log_reasons(caplog)
    assert str(error) in log_reasons(caplog)


MALFORMED = {
    "triage with a status outside the list": (0, {**triage(), "status": "thinking hard"}),
    "pick with broken JSON": (1, {"steps": "this is not JSON"}),
    "pick with a kind outside the list": (1, pick(("launch_missile", QUOTE_1))),
    "pick with a step that has no kind": (1, {"steps": json.dumps([{"evidence_quote": QUOTE_1}])}),
    "fill with broken JSON": (2, {"payload": "this is not JSON"}),
    "fill with a missing field": (2, fill()),
    "card with broken JSON": (3, {"card": "this is not JSON"}),
}


@pytest.mark.parametrize("index,bad", MALFORMED.values(), ids=MALFORMED.keys())
def test_a_malformed_reply_gives_an_abstain_and_a_log(caplog, index, bad):
    caplog.set_level(logging.INFO)
    replies = script(triage(), [("reply", QUOTE_1)], with_card=True)
    replies[index] = bad
    out = interpret(dummy(replies))
    assert out.advice is None
    assert out.abstained.reason == "invalid_output"
    assert "invalid_output" in log_reasons(caplog)


def test_an_exhausted_script_does_not_raise():
    out = interpret(dummy([triage()]))
    assert out.advice is None
    assert out.abstained is not None


# ---- 6. The call store --------------------------------------------------------

def run_stored(tmp_path):
    lm = dummy(script(triage(), [("reply", QUOTE_1), ("pick_option", QUOTE_2)], with_card=True))
    brief = make_brief()
    interpret(lm, brief, log_dir=tmp_path)
    return lm, brief, read_calls(tmp_path)


def test_each_call_is_stored_with_model_id_prompt_hash_raw_reply_and_rendered_input(tmp_path):
    lm, _, calls = run_stored(tmp_path)
    assert [c["stage"] for c in calls] == ["triage", "pick", "fill", "fill", "card"]
    for call in calls:
        assert call["model_id"] == lm.model
        assert call["rendered_input"]
        assert call["prompt_hash"] == hashlib.sha256(call["rendered_input"].encode()).hexdigest()
        assert call["raw_reply"]


def test_the_rendered_input_holds_the_brief_text(tmp_path):
    _, brief, calls = run_stored(tmp_path)
    text = brief.for_model()
    assert all(text in c["rendered_input"] for c in calls)


def test_the_raw_reply_is_what_the_model_returned(tmp_path):
    _, _, calls = run_stored(tmp_path)
    assert "waiting_answer" in calls[0]["raw_reply"]
    assert QUOTE_1 in calls[1]["raw_reply"] and QUOTE_2 in calls[1]["raw_reply"]
    assert "fixed" in calls[2]["raw_reply"]
    assert '"index": 1' in calls[3]["raw_reply"] or '"index":1' in calls[3]["raw_reply"]
    assert CARD["ask"] in calls[4]["raw_reply"]


def test_each_stage_has_its_own_rendered_input(tmp_path):
    _, _, calls = run_stored(tmp_path)
    assert len({c["prompt_hash"] for c in calls}) == 5


def test_an_abstain_run_still_stores_the_calls_it_made(tmp_path):
    lm = dummy(script(BLOCKED, [("reply", NOT_IN_BRIEF)]))
    out = interpret(lm, log_dir=tmp_path)
    assert out.abstained.reason == "quote_not_in_brief"
    calls = read_calls(tmp_path)
    assert calls[0]["stage"] == "triage" and calls[1]["stage"] == "pick"
    assert NOT_IN_BRIEF in calls[1]["raw_reply"]


def test_a_failed_call_is_stored_with_its_error(tmp_path):
    lm = FailingLM(script(BLOCKED, [("reply", QUOTE_1)]), RateLimited("429 Too Many Requests"), fail_at=2)
    out = interpret(lm, log_dir=tmp_path)
    assert out.abstained.reason == "model_error"
    calls = read_calls(tmp_path)
    assert [c["stage"] for c in calls] == ["triage", "pick"]
    assert "429" in calls[1]["error"]
    assert calls[1]["model_id"] == lm.model
    assert calls[1]["prompt_hash"] == hashlib.sha256(calls[1]["rendered_input"].encode()).hexdigest()


def test_no_call_file_is_written_without_a_log_dir(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    interpret(dummy(script(BLOCKED, [("reply", QUOTE_1)])))
    assert list(tmp_path.iterdir()) == []


def test_the_interpreter_never_reads_the_key_when_given_a_model():
    # The autouse fixture makes load_key raise, so a read would fail this test.
    out = interpret(dummy([DONE]))
    assert out.abstained is None


# ---- 7. The CLI ---------------------------------------------------------------

def run_cli(monkeypatch, capsys, lm, transcript, *args):
    api = interpreter_api()
    cli = require("priority.cli")
    monkeypatch.setattr(api, "interpreter_lm", lambda *a, **k: lm)
    monkeypatch.setattr(cli, "interpreter_lm", lambda *a, **k: lm, raising=False)
    try:
        code = cli.main(["interpret", str(transcript), *args])
    except SystemExit as exc:
        code = exc.code
    out = capsys.readouterr().out
    return code, out


def test_the_cli_prints_an_interpretation(monkeypatch, capsys):
    lm = dummy(script(triage(), [("reply", QUOTE_1), ("pick_option", QUOTE_2)], with_card=True))
    code, out = run_cli(monkeypatch, capsys, lm, FIXTURES / "waiting-question.jsonl")
    assert code == 0
    data = json.loads(out)
    assert data.get("abstained") is None
    assert [s["kind"] for s in data["advice"]["proposal"]["steps"]] == ["reply", "pick_option"]
    assert data["advice"]["question"]["ask"] == CARD["ask"]
    assert data["facts"]["status"] == "waiting_answer"


def test_the_cli_prints_an_abstain_for_a_faulty_step(monkeypatch, capsys):
    lm = dummy(script(BLOCKED, [("reply", QUOTE_1), ("reply", NOT_IN_BRIEF)]))
    code, out = run_cli(monkeypatch, capsys, lm, FIXTURES / "waiting-question.jsonl")
    assert code == 0
    data = json.loads(out)
    assert data["abstained"]["reason"] == "quote_not_in_brief"
    assert "step 2" in data["abstained"]["detail"].lower()
    assert not data.get("advice")


def test_the_cli_prints_an_abstain_for_a_model_failure(monkeypatch, capsys):
    lm = FailingLM([triage()], RateLimited("429 Too Many Requests"), fail_at=1)
    code, out = run_cli(monkeypatch, capsys, lm, FIXTURES / "waiting-question.jsonl")
    assert code == 0
    assert json.loads(out)["abstained"]["reason"] == "model_error"


def test_the_cli_stores_the_calls_in_the_log_dir(monkeypatch, capsys, tmp_path):
    lm = dummy(script(BLOCKED, [("reply", QUOTE_1)]))
    code, _ = run_cli(monkeypatch, capsys, lm, FIXTURES / "waiting-question.jsonl", "--log-dir", str(tmp_path))
    assert code == 0
    assert stages(tmp_path) == ["triage", "pick", "fill"]


def test_the_cli_prints_the_brief_abstain_and_never_calls_the_model(monkeypatch, capsys):
    lm = dummy([triage()])
    code, out = run_cli(monkeypatch, capsys, lm, FIXTURES / "brief-only-synthetic.jsonl")
    assert code == 0
    assert json.loads(out)["abstained"]["reason"] == "no_agent_reply"
    assert lm.history == []
