"""Slice 1, the model probe. The model is always a stub. No test makes a network call."""
from __future__ import annotations

import hashlib
import inspect
import json
import logging
import re
import sys
from types import SimpleNamespace

import pytest

from brief_support import brief_api
from probe_support import (AGREEMENT_FIELDS, ASK_TEXT, DIGEST_MODEL, FACT_NAMES, FACTS, FINAL_TEXT, FIXTURES,
                           INTERPRETER_MODEL, QUESTION, SECRETS, UNSET, StubModel, load_probe, log_reasons,
                           probe_with, read_calls, reply)

QUESTION_TRANSCRIPT = FIXTURES / "waiting-question.jsonl"
SECRET_TRANSCRIPT = FIXTURES / "with-secret.jsonl"
DONE_TRANSCRIPT = FIXTURES / "done.jsonl"
CLIENT_TRANSCRIPT = FIXTURES / "brief-client-error.jsonl"


def run_probe(monkeypatch, tmp_path, text=UNSET, error=None, transcript=QUESTION_TRANSCRIPT, **kwargs):
    stub = StubModel(text=text, error=error)
    probe = probe_with(monkeypatch, stub)
    result = probe.run(transcript, log_dir=tmp_path, **kwargs)
    return probe, stub, result


# ---- the public surface ------------------------------------------------------

def test_probe_exposes_run_and_result_fields():
    probe = load_probe()
    params = inspect.signature(probe.run).parameters
    assert list(params)[0] == "transcript"
    assert params["log_dir"].kind is inspect.Parameter.KEYWORD_ONLY
    assert "model" in params, "run has no model argument"
    assert params["model"].kind is inspect.Parameter.KEYWORD_ONLY
    assert params["model"].default == INTERPRETER_MODEL
    fields = set(inspect.signature(probe.ProbeResult).parameters)
    wanted = {*FACT_NAMES, "kind", "quote", "quote_in_text", "abstain_reason", "abstain_detail"}
    assert wanted <= fields


def test_probe_names_the_interpreter_and_the_digest_model():
    probe = load_probe()
    assert probe.INTERPRETER_MODEL == INTERPRETER_MODEL == "nvidia_nim/minimaxai/minimax-m3.1-flash"
    assert probe.DIGEST_MODEL == DIGEST_MODEL == "nvidia_nim/minimaxai/minimax-m3.1-flash"
    assert not hasattr(probe, "MODEL_ID")


def test_call_model_takes_the_model_and_defaults_to_the_interpreter():
    params = inspect.signature(load_probe().call_model).parameters
    assert "model" in params, "call_model has no model argument"
    assert list(params)[0] == "prompt"
    assert params["model"].default == INTERPRETER_MODEL


def test_repeat_and_agreement_signatures():
    probe = load_probe()
    params = inspect.signature(probe.repeat).parameters
    assert list(params)[:2] == ["transcript", "n"]
    for name in ("model", "log_dir"):
        assert params[name].kind is inspect.Parameter.KEYWORD_ONLY
    assert params["model"].default == INTERPRETER_MODEL
    assert params["log_dir"].default is None
    assert list(inspect.signature(probe.agreement).parameters) == ["results"]


# ---- the valid path ----------------------------------------------------------

def test_valid_reply_gives_five_facts_kind_and_quote(monkeypatch, tmp_path):
    _, _, result = run_probe(monkeypatch, tmp_path, reply())
    assert {n: getattr(result, n) for n in FACT_NAMES} == FACTS
    assert result.kind == "reply"
    assert result.quote == QUESTION
    assert result.quote_in_text is True
    assert result.abstain_reason is None


def test_probe_makes_exactly_one_model_call(monkeypatch, tmp_path):
    _, stub, _ = run_probe(monkeypatch, tmp_path, reply())
    assert len(stub.prompts) == 1
    assert stub.models == [INTERPRETER_MODEL]


def test_prompt_holds_the_ask_and_the_whole_final_reply(monkeypatch, tmp_path):
    _, stub, _ = run_probe(monkeypatch, tmp_path, reply())
    assert ASK_TEXT in stub.prompts[0]
    assert FINAL_TEXT in stub.prompts[0]


def test_done_transcript_runs_the_same_path(monkeypatch, tmp_path):
    text = reply(status="done", needs_human=False, answer_class="none", kind="dismiss",
                 evidence_quote="All checks pass.")
    _, _, result = run_probe(monkeypatch, tmp_path, text, transcript=DONE_TRANSCRIPT)
    assert (result.status, result.kind, result.quote_in_text) == ("done", "dismiss", True)
    assert result.abstain_reason is None


# ---- code checks the quote ---------------------------------------------------

def test_quote_not_in_the_brief_gives_an_abstain(monkeypatch, tmp_path):
    quote = "Use exponential backoff, as agreed"
    _, _, result = run_probe(monkeypatch, tmp_path, reply(evidence_quote=quote))
    assert result.abstain_reason == "quote_not_in_brief"
    assert result.quote == quote
    assert result.quote_in_text is False
    assert quote[:20] in result.abstain_detail


def test_quote_check_is_an_exact_match(monkeypatch, tmp_path):
    _, _, result = run_probe(monkeypatch, tmp_path, reply(evidence_quote=QUESTION.upper()))
    assert result.abstain_reason == "quote_not_in_brief"
    assert result.quote_in_text is False


def test_empty_quote_gives_an_abstain(monkeypatch, tmp_path):
    _, _, result = run_probe(monkeypatch, tmp_path, reply(evidence_quote=""))
    assert result.abstain_reason in {"quote_not_in_brief", "invalid_output"}
    assert result.quote_in_text is False


def test_ask_human_needs_no_quote(monkeypatch, tmp_path):
    _, _, result = run_probe(monkeypatch, tmp_path, reply(kind="ask_human", evidence_quote=""))
    assert result.kind == "ask_human"
    assert result.abstain_reason is None


def test_kind_outside_the_thirteen_gives_an_abstain(monkeypatch, tmp_path):
    _, _, result = run_probe(monkeypatch, tmp_path, reply(kind="launch_missiles"))
    assert result.abstain_reason == "kind_not_allowed"
    assert "launch_missiles" in result.abstain_detail


# ---- a reply that does not parse ---------------------------------------------

def bad_value(key, value):
    return json.dumps({**FACTS, "kind": "reply", "evidence_quote": QUESTION, key: value})


def missing_key(key):
    body = {**FACTS, "kind": "reply", "evidence_quote": QUESTION}
    del body[key]
    return json.dumps(body)


INVALID_REPLIES = {
    "not json": "I think the session is waiting.",
    "json array": json.dumps([FACTS]),
    "empty reply": "",
    "bad status": bad_value("status", "banana"),
    "bad answer class": bad_value("answer_class", "whatever"),
    "bad risk": bad_value("risk", "extreme"),
    "bad priority hint": bad_value("priority_hint", "yesterday"),
    "needs_human is text": bad_value("needs_human", "yes"),
    "missing status": missing_key("status"),
    "missing kind": missing_key("kind"),
    "missing quote": missing_key("evidence_quote"),
}


@pytest.mark.parametrize("text", INVALID_REPLIES.values(), ids=INVALID_REPLIES.keys())
def test_reply_that_does_not_parse_gives_an_abstain(monkeypatch, tmp_path, text):
    _, _, result = run_probe(monkeypatch, tmp_path, text)
    assert result.abstain_reason == "invalid_output"
    assert result.quote_in_text is False


# ---- a failed model call ------------------------------------------------------

class RateLimited(Exception):
    pass


FAILURES = {
    "rate limit": (RateLimited("429 Too Many Requests"), "model_error"),
    "server error": (RuntimeError("503 upstream unavailable"), "model_error"),
    "timeout": (TimeoutError("no reply in 60 seconds"), "model_timeout"),
}


@pytest.mark.parametrize("error,reason", FAILURES.values(), ids=FAILURES.keys())
def test_failed_call_ends_as_an_abstain_with_a_logged_reason(monkeypatch, tmp_path, caplog, error, reason):
    caplog.set_level(logging.INFO)
    _, _, result = run_probe(monkeypatch, tmp_path, error=error)
    assert result.abstain_reason == reason
    assert result.quote_in_text is False
    assert reason in log_reasons(caplog)
    assert str(error) in log_reasons(caplog) or str(error) in result.abstain_detail


# ---- each call is stored ------------------------------------------------------

def test_each_call_is_stored_with_model_id_prompt_hash_and_raw_reply(monkeypatch, tmp_path):
    text = reply()
    probe, stub, _ = run_probe(monkeypatch, tmp_path, text)
    calls = read_calls(tmp_path)
    assert len(calls) == 1
    assert calls[0]["model_id"] == INTERPRETER_MODEL
    assert calls[0]["prompt_hash"] == hashlib.sha256(stub.prompts[0].encode()).hexdigest()
    assert calls[0]["raw_reply"] == text
    assert calls[0]["reasoning"] is None


def test_call_log_holds_the_full_prompt_that_the_hash_matches(monkeypatch, tmp_path):
    _, stub, _ = run_probe(monkeypatch, tmp_path, reply())
    call = read_calls(tmp_path)[0]
    assert call["prompt"] == stub.prompts[0]
    assert hashlib.sha256(call["prompt"].encode()).hexdigest() == call["prompt_hash"]


def test_the_prompt_in_the_log_is_redacted(monkeypatch, tmp_path):
    _, stub, _ = run_probe(monkeypatch, tmp_path, reply(evidence_quote="The deploy finished."),
                           transcript=SECRET_TRANSCRIPT)
    call = read_calls(tmp_path)[0]
    assert not any(secret in call["prompt"] for secret in SECRETS)
    assert call["prompt"] == stub.prompts[0]
    assert hashlib.sha256(call["prompt"].encode()).hexdigest() == call["prompt_hash"]


def test_raw_reply_is_stored_even_when_it_does_not_parse(monkeypatch, tmp_path):
    run_probe(monkeypatch, tmp_path, "not json at all")
    assert read_calls(tmp_path)[0]["raw_reply"] == "not json at all"


def test_failed_call_is_stored_with_the_error_text(monkeypatch, tmp_path):
    probe, stub, _ = run_probe(monkeypatch, tmp_path, error=RateLimited("429 Too Many Requests"))
    call = read_calls(tmp_path)[0]
    assert call["model_id"] == INTERPRETER_MODEL
    assert call["prompt_hash"] == hashlib.sha256(stub.prompts[0].encode()).hexdigest()
    assert call["prompt"] == stub.prompts[0]
    assert call["raw_reply"] is None
    assert call["reasoning"] is None
    assert "429" in call["error"]


def test_a_second_run_appends_a_second_record(monkeypatch, tmp_path):
    probe, _, _ = run_probe(monkeypatch, tmp_path, reply())
    probe.run(DONE_TRANSCRIPT, log_dir=tmp_path)
    assert len(read_calls(tmp_path)) == 2


# ---- the model argument and the reply shapes -------------------------------------

def test_run_passes_the_model_to_call_model_and_logs_it(monkeypatch, tmp_path):
    _, stub, result = run_probe(monkeypatch, tmp_path, reply(), model=DIGEST_MODEL)
    assert stub.models == [DIGEST_MODEL]
    assert read_calls(tmp_path)[0]["model_id"] == DIGEST_MODEL
    assert result.abstain_reason is None

@pytest.mark.parametrize("envelope", [False, True], ids=["structured-json", "text-envelope"])
def test_call_model_normalizes_structured_and_text_replies(monkeypatch, tmp_path, envelope):
    probe = load_probe()
    body = json.loads(reply())
    reasoning = "The agent needs the human to choose a retry style."
    output = {"text": reply(), "reasoning_content": reasoning} if envelope else body
    usage = {"prompt_tokens": 9}
    cost = 0.001

    class StubLM:
        def __init__(self, *args, **kwargs):
            self.history = [{"usage": usage, "cost": cost}]

        def __call__(self, prompt):
            assert QUESTION in prompt
            return [output]

    monkeypatch.setitem(sys.modules, "dspy", SimpleNamespace(LM=StubLM))
    monkeypatch.setattr(probe, "load_key", lambda: "test-key")
    result = probe.run(QUESTION_TRANSCRIPT, log_dir=tmp_path)

    assert result.status == "waiting_answer"
    assert result.kind == "reply"
    assert result.quote_in_text is True
    assert result.abstain_reason is None
    call = read_calls(tmp_path)[0]
    assert call["raw_reply"] == reply()
    assert call["reasoning"] == (reasoning if envelope else None)
    assert call["usage"] == usage
    assert call["cost"] == cost


def test_call_model_keeps_empty_text_envelope_metadata(monkeypatch):
    probe = load_probe()
    reasoning = "The model stopped before it returned JSON."
    usage = {"completion_tokens": 3000}
    cost = 0.001

    class StubLM:
        def __init__(self, *args, **kwargs):
            self.history = [{"usage": usage, "cost": cost}]

        def __call__(self, prompt):
            return [{"text": None, "reasoning_content": reasoning}]

    monkeypatch.setitem(sys.modules, "dspy", SimpleNamespace(LM=StubLM))
    monkeypatch.setattr(probe, "load_key", lambda: "test-key")

    assert probe.call_model("prompt") == {
        "text": None,
        "reasoning_content": reasoning,
        "usage": usage,
        "cost": cost,
    }

def test_dict_reply_uses_the_text_and_stores_the_reasoning(monkeypatch, tmp_path):
    reasoning = "The agent asks which retry style the human wants."
    _, _, result = run_probe(monkeypatch, tmp_path, {"text": reply(), "reasoning_content": reasoning})
    assert {n: getattr(result, n) for n in FACT_NAMES} == FACTS
    assert result.abstain_reason is None
    call = read_calls(tmp_path)[0]
    assert call["raw_reply"] == reply()
    assert call["reasoning"] == reasoning


def test_dict_reply_without_reasoning_stores_none(monkeypatch, tmp_path):
    _, _, result = run_probe(monkeypatch, tmp_path, {"text": reply()})
    assert result.abstain_reason is None
    assert read_calls(tmp_path)[0]["reasoning"] is None


def test_dict_reply_with_text_that_does_not_parse_gives_an_abstain(monkeypatch, tmp_path):
    _, _, result = run_probe(monkeypatch, tmp_path, {"text": "no json here", "reasoning_content": "hm"})
    assert result.abstain_reason == "invalid_output"
    assert read_calls(tmp_path)[0]["raw_reply"] == "no json here"


ODD_SHAPES = {
    "none": None,
    "list": [reply()],
    "dict without text": {"reasoning_content": "only thoughts"},
    "dict with other keys": {"content": reply()},
}


@pytest.mark.parametrize("shape", ODD_SHAPES.values(), ids=ODD_SHAPES.keys())
def test_other_reply_shape_gives_an_abstain_and_no_crash(monkeypatch, tmp_path, shape):
    _, _, result = run_probe(monkeypatch, tmp_path, shape)
    assert result.abstain_reason == "invalid_output"
    assert result.quote_in_text is False
    assert len(read_calls(tmp_path)) == 1


def test_reasoning_with_a_secret_does_not_reach_the_call_log(monkeypatch, tmp_path):
    reasoning = f"The agent leaked the token {SECRETS[1]} and asks about it."
    run_probe(monkeypatch, tmp_path, {"text": reply(), "reasoning_content": reasoning})
    call = read_calls(tmp_path)[0]
    assert isinstance(call["reasoning"], str) and call["reasoning"]
    assert not any(secret in (tmp_path / "calls.jsonl").read_text() for secret in SECRETS)


# ---- the stop and the human label ----------------------------------------------

def test_brief_puts_the_human_ask_before_the_final_reply(monkeypatch):
    probe = probe_with(monkeypatch, StubModel(text=reply()))
    brief = probe.brief_text(QUESTION_TRANSCRIPT)
    assert brief.index(ASK_TEXT) < brief.index(FINAL_TEXT)


def test_prompt_holds_the_brief_text(monkeypatch, tmp_path):
    _, stub, _ = run_probe(monkeypatch, tmp_path, reply())
    assert load_probe().brief_text(QUESTION_TRANSCRIPT) in stub.prompts[0]


def test_probe_passes_the_complete_shared_brief_to_the_model(monkeypatch, tmp_path):
    brief_module = brief_api()
    build_brief = brief_module.build_brief
    built_briefs = []

    def recording_build(*args, **kwargs):
        brief = build_brief(*args, **kwargs)
        built_briefs.append(brief)
        return brief

    monkeypatch.setattr(brief_module, "build_brief", recording_build)
    client_message = "You have reached the usage limit. It resets at 3pm."
    stub = StubModel(text=reply(evidence_quote=client_message))
    probe = probe_with(monkeypatch, stub)
    assert getattr(probe, "build_brief", None) is recording_build
    result = probe.run(CLIENT_TRANSCRIPT, log_dir=tmp_path)

    assert len(built_briefs) == 1
    assert built_briefs[0].final in built_briefs[0].for_model()
    assert built_briefs[0].for_model() in stub.prompts[0]
    assert client_message in stub.prompts[0]
    assert result.abstain_reason is None
    assert result.quote_in_text is True


def test_quote_validation_uses_the_complete_shared_brief(monkeypatch, tmp_path):
    brief_module = brief_api()
    build_brief = brief_module.build_brief
    built_briefs = []

    def recording_build(*args, **kwargs):
        brief = build_brief(*args, **kwargs)
        built_briefs.append(brief)
        return brief

    monkeypatch.setattr(brief_module, "build_brief", recording_build)
    quote = "Quote fabricated only for this test: zqv-918273."
    stub = StubModel(text=reply(evidence_quote=quote))
    probe = probe_with(monkeypatch, stub)
    assert getattr(probe, "build_brief", None) is recording_build
    result = probe.run(CLIENT_TRANSCRIPT, log_dir=tmp_path)

    assert len(built_briefs) == 1
    assert result.abstain_reason == "quote_not_in_brief"
    assert result.quote_in_text is False


def test_unusable_shared_brief_abstains_without_calling_model(monkeypatch, tmp_path):
    stub = StubModel(text=reply())
    probe = probe_with(monkeypatch, stub)
    assert callable(getattr(probe, "build_brief", None))
    result = probe.run(FIXTURES / "brief-only-synthetic.jsonl", log_dir=tmp_path)
    assert result.abstain_reason == "no_agent_reply"
    assert stub.prompts == []

# ---- repeat and agreement -------------------------------------------------------

def valid_result(probe, **changes):
    return probe.ProbeResult(**{**FACTS, "kind": "reply", "quote": QUESTION, "quote_in_text": True, **changes})


def test_repeat_makes_n_calls_on_one_brief_and_returns_n_results(monkeypatch, tmp_path):
    stub = StubModel(text=reply())
    probe = probe_with(monkeypatch, stub)
    results = probe.repeat(QUESTION_TRANSCRIPT, 3, log_dir=tmp_path)
    assert isinstance(results, list) and len(results) == 3
    assert all(isinstance(r, probe.ProbeResult) for r in results)
    assert len(stub.prompts) == 3
    assert len(set(stub.prompts)) == 1
    assert stub.models == [INTERPRETER_MODEL] * 3
    assert len(read_calls(tmp_path)) == 3


def test_repeat_passes_the_model_and_keeps_failures_as_abstains(monkeypatch, tmp_path):
    stub = StubModel(replies=[reply(), "not json", reply()])
    probe = probe_with(monkeypatch, stub)
    results = probe.repeat(QUESTION_TRANSCRIPT, 3, model=DIGEST_MODEL, log_dir=tmp_path)
    assert stub.models == [DIGEST_MODEL] * 3
    assert [r.abstain_reason for r in results] == [None, "invalid_output", None]
    assert {c["model_id"] for c in read_calls(tmp_path)} == {DIGEST_MODEL}


def test_agreement_has_the_five_facts_and_the_kind():
    probe = load_probe()
    shares = probe.agreement([valid_result(probe), valid_result(probe)])
    assert set(shares) == set(AGREEMENT_FIELDS)
    assert all(shares[f] == pytest.approx(1.0) for f in AGREEMENT_FIELDS)


def test_agreement_is_the_share_that_holds_the_most_common_value():
    probe = load_probe()
    results = [valid_result(probe), valid_result(probe, status="done", kind="dismiss"),
               valid_result(probe, risk="high", needs_human=False)]
    shares = probe.agreement(results)
    assert shares["status"] == pytest.approx(2 / 3)
    assert shares["kind"] == pytest.approx(2 / 3)
    assert shares["risk"] == pytest.approx(2 / 3)
    assert shares["needs_human"] == pytest.approx(2 / 3)
    assert shares["answer_class"] == pytest.approx(1.0)
    assert shares["priority_hint"] == pytest.approx(1.0)


def test_agreement_of_a_split_is_the_share_of_the_largest_group():
    probe = load_probe()
    results = [valid_result(probe, risk=r) for r in ("low", "medium", "high", "low")]
    assert probe.agreement(results)["risk"] == pytest.approx(0.5)


def test_agreement_counts_an_abstain_as_the_value_abstain():
    probe = load_probe()
    failed = probe.ProbeResult(abstain_reason="model_error", abstain_detail="429")
    shares = probe.agreement([valid_result(probe), valid_result(probe), failed])
    assert all(shares[f] == pytest.approx(2 / 3) for f in AGREEMENT_FIELDS)
    shares = probe.agreement([valid_result(probe), failed, failed])
    assert all(shares[f] == pytest.approx(2 / 3) for f in AGREEMENT_FIELDS)
    assert all(probe.agreement([failed, failed])[f] == pytest.approx(1.0) for f in AGREEMENT_FIELDS)


def test_agreement_counts_an_abstain_that_kept_its_facts_as_abstain():
    probe = load_probe()
    unquoted = valid_result(probe, quote_in_text=False, abstain_reason="quote_not_in_brief")
    shares = probe.agreement([valid_result(probe), valid_result(probe), unquoted])
    assert all(shares[f] == pytest.approx(2 / 3) for f in AGREEMENT_FIELDS)


# ---- redaction runs before the model ------------------------------------------

def test_secrets_are_redacted_before_the_model_call(monkeypatch, tmp_path):
    _, stub, _ = run_probe(monkeypatch, tmp_path, reply(evidence_quote="The deploy finished."),
                           transcript=SECRET_TRANSCRIPT)
    assert len(stub.prompts) == 1
    for secret in SECRETS:
        assert secret not in stub.prompts[0]
    assert "The deploy finished." in stub.prompts[0]
    assert "Deploy the report job." in stub.prompts[0]


def test_redaction_runs_even_when_the_model_call_fails(monkeypatch, tmp_path):
    _, stub, _ = run_probe(monkeypatch, tmp_path, error=TimeoutError("slow"), transcript=SECRET_TRANSCRIPT)
    assert len(stub.prompts) == 1
    assert not any(secret in stub.prompts[0] for secret in SECRETS)


def test_quote_check_uses_the_redacted_text(monkeypatch, tmp_path):
    for secret in SECRETS:
        _, _, result = run_probe(monkeypatch, tmp_path, reply(evidence_quote=secret), transcript=SECRET_TRANSCRIPT)
        assert result.abstain_reason == "quote_not_in_brief"
        assert result.quote_in_text is False


def test_no_secret_reaches_the_call_log(monkeypatch, tmp_path):
    run_probe(monkeypatch, tmp_path, reply(evidence_quote="The deploy finished."), transcript=SECRET_TRANSCRIPT)
    stored = (tmp_path / "calls.jsonl").read_text()
    assert not any(secret in stored for secret in SECRETS)


# ---- the command line ---------------------------------------------------------

def printed(capsys) -> dict[str, str]:
    pairs = (line.split(":", 1) for line in capsys.readouterr().out.splitlines() if ":" in line)
    return {k.strip(): v.strip() for k, v in pairs}


def test_main_prints_the_facts_kind_quote_and_quote_check(monkeypatch, tmp_path, capsys):
    probe = probe_with(monkeypatch, StubModel(text=reply()))
    assert probe.main([str(QUESTION_TRANSCRIPT), "--log-dir", str(tmp_path)]) == 0
    lines = printed(capsys)
    assert lines["status"] == "waiting_answer"
    assert lines["needs_human"].lower() == "true"
    assert (lines["answer_class"], lines["risk"], lines["priority_hint"]) == ("decide", "low", "soon")
    assert lines["kind"] == "reply"
    assert lines["quote"] == QUESTION
    assert lines["quote_in_text"].lower() == "true"


def test_main_reports_a_quote_that_is_not_in_the_text(monkeypatch, tmp_path, capsys):
    probe = probe_with(monkeypatch, StubModel(text=reply(evidence_quote="Use UTC, as agreed")))
    probe.main([str(QUESTION_TRANSCRIPT), "--log-dir", str(tmp_path)])
    assert printed(capsys)["quote_in_text"].lower() == "false"


def test_main_ends_with_exit_zero_after_a_failed_call(monkeypatch, tmp_path, capsys):
    probe = probe_with(monkeypatch, StubModel(error=RateLimited("429 Too Many Requests")))
    assert probe.main([str(QUESTION_TRANSCRIPT), "--log-dir", str(tmp_path)]) == 0
    assert printed(capsys)["quote_in_text"].lower() == "false"


def test_main_output_holds_no_secret(monkeypatch, tmp_path, capsys):
    probe = probe_with(monkeypatch, StubModel(text=reply(evidence_quote="The deploy finished.")))
    probe.main([str(SECRET_TRANSCRIPT), "--log-dir", str(tmp_path)])
    out = capsys.readouterr().out
    assert not any(secret in out for secret in SECRETS)


def agreement_lines(capsys) -> dict[str, float]:
    found = {}
    for line in capsys.readouterr().out.splitlines():
        match = re.fullmatch(r"agreement: (\w+)=([0-9.]+)", line.strip())
        if match:
            found[match[1]] = float(match[2])
    return found


def test_main_picks_the_interpreter_by_default(monkeypatch, tmp_path):
    stub = StubModel(text=reply())
    probe = probe_with(monkeypatch, stub)
    probe.main([str(QUESTION_TRANSCRIPT), "--log-dir", str(tmp_path)])
    assert stub.models == [INTERPRETER_MODEL]
    assert read_calls(tmp_path)[0]["model_id"] == INTERPRETER_MODEL


@pytest.mark.parametrize("flag,model", [("interpreter", INTERPRETER_MODEL), ("digest", DIGEST_MODEL)])
def test_main_model_flag_picks_the_model(monkeypatch, tmp_path, flag, model):
    stub = StubModel(text=reply())
    probe = probe_with(monkeypatch, stub)
    assert probe.main([str(QUESTION_TRANSCRIPT), "--log-dir", str(tmp_path), "--model", flag]) == 0
    assert stub.models == [model]
    assert read_calls(tmp_path)[0]["model_id"] == model


def test_main_rejects_a_model_that_is_not_interpreter_or_digest(monkeypatch, tmp_path):
    stub = StubModel(text=reply())
    probe = probe_with(monkeypatch, stub)
    assert probe.main([str(QUESTION_TRANSCRIPT), "--log-dir", str(tmp_path), "--model", "digest"]) == 0
    with pytest.raises(SystemExit):
        probe.main([str(QUESTION_TRANSCRIPT), "--log-dir", str(tmp_path), "--model", "mistral"])
    assert len(stub.prompts) == 1


def test_main_with_one_run_prints_no_agreement_line(monkeypatch, tmp_path, capsys):
    probe = probe_with(monkeypatch, StubModel(text=reply()))
    probe.main([str(QUESTION_TRANSCRIPT), "--log-dir", str(tmp_path)])
    assert "agreement" not in capsys.readouterr().out


def test_main_repeat_makes_n_calls_and_prints_agreement_for_six_fields(monkeypatch, tmp_path, capsys):
    stub = StubModel(replies=[reply(), reply(), reply(status="done")])
    probe = probe_with(monkeypatch, stub)
    assert probe.main([str(QUESTION_TRANSCRIPT), "--log-dir", str(tmp_path), "--repeat", "3"]) == 0
    assert len(stub.prompts) == 3
    assert len(read_calls(tmp_path)) == 3
    shares = agreement_lines(capsys)
    assert set(shares) == set(AGREEMENT_FIELDS)
    assert shares["status"] == pytest.approx(2 / 3, abs=0.01)
    assert all(shares[f] == pytest.approx(1.0) for f in AGREEMENT_FIELDS if f != "status")


def test_main_repeat_ends_with_exit_zero_when_every_call_fails(monkeypatch, tmp_path, capsys):
    probe = probe_with(monkeypatch, StubModel(error=RateLimited("429 Too Many Requests")))
    assert probe.main([str(QUESTION_TRANSCRIPT), "--log-dir", str(tmp_path), "--repeat", "2"]) == 0
    assert set(agreement_lines(capsys).values()) == {1.0}
