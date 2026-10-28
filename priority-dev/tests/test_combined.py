"""Slice 17 RED: the one-call combined variant against the split chain.

Each test fails until the variant exists. The contract: `uv run priority
eval --variant combined` runs Triage and one call that writes the steps, the
payloads, and the card. Code sets session, author, and confidence. A bad kind
or an empty quote in any step gives an Abstain naming the step, while a quote
that is only not in the brief stays in the proposal (the metric ignores
it). Four or more steps give an Abstain. A contradiction check counts
proposals where the card and the first step disagree (a snooze beside a
question card), for both variants. All briefs, labels, and DummyLM replies
here are made up, and no test makes a live model call.
"""
from __future__ import annotations

import inspect

from combined_support import (CARD, MEASURE_PREFIXES, NOT_IN_BRIEF, QUOTE_1, QUOTE_2,
                              REPLY_TEXT, SESSION_ID, SHORT_FINAL, combined_reply,
                              contradiction_api, contradiction_case, interpret_chain,
                              interpret_combined, interpreter_api, make_brief, prediction_for,
                              run_eval_variant)
from interpret_support import (BLOCKED, card, dummy, fill, no_live_call, pick, read_calls,  # noqa: F401
                               step_names_in, triage)

def happy_chain():
    return [triage(), pick(("reply", QUOTE_1), ("snooze", QUOTE_2)),
            fill(text=REPLY_TEXT), fill(), card(CARD)]


def happy_combined():
    return [triage(), combined_reply([("reply", QUOTE_1, 0.8, {"text": REPLY_TEXT}),
                                      ("snooze", QUOTE_2, 0.7, {})], card=CARD)]


# ---- 1. The variant is announced -------------------------------------------

def test_combined_spelling_is_announced():
    api = interpreter_api()
    has_flag = "variant" in inspect.signature(api.Interpreter.__init__).parameters
    assert has_flag or hasattr(api, "CombinedInterpreter"), \
        "need Interpreter(variant='combined') or CombinedInterpreter (slice 17)"


# ---- 2. The same Interpretation types as the chain --------------------------

def test_combined_returns_the_same_types_as_the_chain(tmp_path):
    brief = make_brief(tmp_path)
    chain = interpret_chain(dummy(happy_chain()), brief)
    out = interpret_combined(dummy(happy_combined()), brief)
    assert chain.abstained is None and out.abstained is None
    assert type(out.advice.proposal) is type(chain.advice.proposal)
    assert type(out.advice.question) is type(chain.advice.question)


def test_combined_abstain_has_the_same_type_as_the_chain(tmp_path):
    brief = make_brief(tmp_path)
    bad_chain = [BLOCKED, pick(("approve_gate", QUOTE_1))]
    bad_combined = [BLOCKED, combined_reply([("approve_gate", QUOTE_1, 0.8, {"scope": "once"})])]
    kwargs = {"allowed_kinds": ("reply",)}
    assert type(interpret_combined(dummy(bad_combined), brief, **kwargs).abstained) is type(
        interpret_chain(dummy(bad_chain), brief, **kwargs).abstained)

# ---- 3. One call after Triage -----------------------------------------------

def test_combined_makes_one_call_after_triage(tmp_path):
    lm = dummy(happy_combined())
    out = interpret_combined(lm, make_brief(tmp_path), log_dir=tmp_path / "logs")
    assert out.abstained is None
    assert len(lm.history) == 2, f"want Triage plus one call, made {len(lm.history)}"
    stages = [call["stage"] for call in read_calls(tmp_path / "logs")]
    assert len(stages) == 2 and stages[0] == "triage"


def test_combined_two_steps_keep_payloads_quotes_and_card(tmp_path):
    out = interpret_combined(dummy(happy_combined()), make_brief(tmp_path))
    kinds = [step.kind for step in out.advice.proposal.steps]
    assert kinds == ["reply", "snooze"]
    assert [step.evidence_quote for step in out.advice.proposal.steps] == [QUOTE_1, QUOTE_2]
    assert out.advice.proposal.steps[0].text == REPLY_TEXT
    assert out.advice.question is not None and out.advice.question.ask == CARD["ask"]


def test_code_sets_session_author_and_confidence(tmp_path):
    out = interpret_combined(dummy(happy_combined()), make_brief(tmp_path), session_id=SESSION_ID)
    for step, confidence in zip(out.advice.proposal.steps, (0.8, 0.7)):
        assert step.session_id == SESSION_ID
        assert step.author == "interpreter"
        assert step.confidence == confidence


# ---- 4. The kind and quote checks name the step -------------------------------

def test_bad_kind_in_step_two_gives_a_named_step_abstain(tmp_path):
    steps = [("reply", QUOTE_1, 0.8, {"text": REPLY_TEXT}),
             ("approve_permission", QUOTE_2, 0.8, {"scope": "once"})]
    out = interpret_combined(dummy([BLOCKED, combined_reply(steps)]), make_brief(tmp_path),
                             allowed_kinds=("reply", "snooze"))
    assert out.advice is None
    assert out.abstained.reason == "kind_not_allowed"
    assert step_names_in(out.abstained) == {2}


def test_bad_quote_in_step_two_stays_in_the_proposal(tmp_path):
    steps = [("reply", QUOTE_1, 0.8, {"text": REPLY_TEXT}),
             ("reply", NOT_IN_BRIEF, 0.8, {"text": REPLY_TEXT})]
    out = interpret_combined(dummy([BLOCKED, combined_reply(steps)]), make_brief(tmp_path))
    assert out.abstained is None
    assert [step.kind for step in out.advice.proposal.steps] == ["reply", "reply"]
    assert out.advice.proposal.steps[1].evidence_quote == NOT_IN_BRIEF
    assert out.facts.status == "blocked"


def test_four_steps_give_an_abstain(tmp_path):
    steps = [("reply", QUOTE_1, 0.8, {"text": REPLY_TEXT}),
             ("snooze", QUOTE_2, 0.7, {}),
             ("reply", QUOTE_1, 0.6, {"text": REPLY_TEXT}),
             ("dismiss", QUOTE_2, 0.5, {"reason": "done"})]
    out = interpret_combined(dummy([BLOCKED, combined_reply(steps)]), make_brief(tmp_path))
    assert out.advice is None
    assert out.abstained is not None and out.abstained.reason
    assert out.abstained.reason not in ("quote_not_in_brief", "kind_not_allowed")


# ---- 5. A done stop matches the chain ------------------------------------------

def test_done_stop_gives_one_code_built_notify_step(tmp_path):
    brief = make_brief(tmp_path, name="done.jsonl", final=SHORT_FINAL)
    lm = dummy([triage(status="done", needs_human=False, answer_class="none")])
    out = interpret_combined(lm, brief)
    assert len(lm.history) == 1, f"a done stop must end after Triage, made {len(lm.history)} calls"
    assert [step.kind for step in out.advice.proposal.steps] == ["notify"]
    assert out.advice.proposal.steps[0].excerpt == SHORT_FINAL


def test_empty_final_reply_on_done_matches_the_chain_abstain(tmp_path):
    brief = make_brief(tmp_path, name="empty.jsonl", final="")
    done = [triage(status="done", needs_human=False, answer_class="none")]
    chain = interpret_chain(dummy(list(done)), brief)
    out = interpret_combined(dummy(list(done)), brief)
    assert chain.abstained is not None and out.abstained is not None
    assert out.abstained.reason == chain.abstained.reason
    assert out.abstained.detail == chain.abstained.detail


# ---- 6. The contradiction count, for both variants ------------------------------

def test_contradiction_count_counts_a_snooze_with_a_card():
    count = contradiction_api()
    assert count([contradiction_case("snooze", with_card=True)]) == 1
    assert count([contradiction_case("snooze", with_card=False)]) == 0
    assert count([{"steps": ["snooze"], "quotes": [], "abstain": None}]) == 0
    assert count([contradiction_case("ask_human", with_card=True)]) == 0


def test_contradiction_count_works_for_both_variants(tmp_path):
    brief = make_brief(tmp_path)
    chain_lm = dummy([triage(), pick(("snooze", QUOTE_1)), fill(), card(CARD)])
    combined_lm = dummy([triage(), combined_reply([("snooze", QUOTE_1, 0.8, {})], card=CARD)])
    chain_out = interpret_chain(chain_lm, brief)
    combined_out = interpret_combined(combined_lm, brief)
    assert chain_out.abstained is None and combined_out.abstained is None
    count = contradiction_api()
    assert count([prediction_for(chain_out), prediction_for(combined_out)]) == 2


# ---- 7. eval --variant combined ---------------------------------------------------

def test_eval_variant_combined_matches_chain_measures(monkeypatch, tmp_path):
    code, chain_report, parts, _ = run_eval_variant(monkeypatch, tmp_path, ["--split", "train"])
    assert code == 0
    for prefix in MEASURE_PREFIXES:
        assert prefix in chain_report.lower(), f"chain report lacks {prefix!r}"
    combined_code, printed, _, recorded = run_eval_variant(
        monkeypatch, tmp_path, ["--variant", "combined", "--split", "train"])
    assert combined_code == 0, "eval --variant combined must run (slice 17)"
    lowered = printed.lower()
    for prefix in MEASURE_PREFIXES:
        assert prefix in lowered, f"combined report lacks the chain measure {prefix!r}"
    for session_id in parts["train"]:
        assert session_id in printed, f"combined report skips train stop {session_id}"
    assert "contradict" in lowered, "combined report must carry the contradiction count"
    assert "combined" in [kwargs.get("variant") for kwargs in recorded]
