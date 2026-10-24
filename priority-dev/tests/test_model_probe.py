"""Slice 1, the model probe. The model is always a stub. No test makes a network call."""
from __future__ import annotations

import hashlib
import inspect
import json
import logging

import pytest

from probe_support import (ASK_TEXT, FACT_NAMES, FACTS, FINAL_TEXT, FIXTURES, QUESTION, SECRETS,
                           StubModel, load_probe, log_reasons, probe_with, read_calls, reply)

QUESTION_BRIEF = FIXTURES / "waiting-question.jsonl"
SECRET_BRIEF = FIXTURES / "with-secret.jsonl"
DONE_BRIEF = FIXTURES / "done.jsonl"


def run_probe(monkeypatch, tmp_path, text=None, error=None, transcript=QUESTION_BRIEF):
    stub = StubModel(text=text, error=error)
    probe = probe_with(monkeypatch, stub)
    result = probe.run(transcript, log_dir=tmp_path)
    return probe, stub, result


# ---- the public surface ------------------------------------------------------

def test_probe_exposes_run_and_result_fields():
    probe = load_probe()
    params = inspect.signature(probe.run).parameters
    assert list(params)[0] == "transcript"
    assert params["log_dir"].kind is inspect.Parameter.KEYWORD_ONLY
    assert probe.MODEL_ID == "openrouter/mistralai/mistral-nemo"
    fields = set(inspect.signature(probe.ProbeResult).parameters)
    wanted = {*FACT_NAMES, "kind", "quote", "quote_in_text", "abstain_reason", "abstain_detail"}
    assert wanted <= fields


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


def test_prompt_holds_the_ask_and_the_whole_final_reply(monkeypatch, tmp_path):
    _, stub, _ = run_probe(monkeypatch, tmp_path, reply())
    assert ASK_TEXT in stub.prompts[0]
    assert FINAL_TEXT in stub.prompts[0]


def test_done_transcript_runs_the_same_path(monkeypatch, tmp_path):
    text = reply(status="done", needs_human=False, answer_class="none", kind="dismiss",
                 evidence_quote="All checks pass.")
    _, _, result = run_probe(monkeypatch, tmp_path, text, transcript=DONE_BRIEF)
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
    assert calls[0]["model_id"] == probe.MODEL_ID
    assert calls[0]["prompt_hash"] == hashlib.sha256(stub.prompts[0].encode()).hexdigest()
    assert calls[0]["raw_reply"] == text


def test_raw_reply_is_stored_even_when_it_does_not_parse(monkeypatch, tmp_path):
    run_probe(monkeypatch, tmp_path, "not json at all")
    assert read_calls(tmp_path)[0]["raw_reply"] == "not json at all"


def test_failed_call_is_stored_with_the_error_text(monkeypatch, tmp_path):
    probe, stub, _ = run_probe(monkeypatch, tmp_path, error=RateLimited("429 Too Many Requests"))
    call = read_calls(tmp_path)[0]
    assert call["model_id"] == probe.MODEL_ID
    assert call["prompt_hash"] == hashlib.sha256(stub.prompts[0].encode()).hexdigest()
    assert call["raw_reply"] is None
    assert "429" in call["error"]


def test_a_second_run_appends_a_second_record(monkeypatch, tmp_path):
    probe, _, _ = run_probe(monkeypatch, tmp_path, reply())
    probe.run(DONE_BRIEF, log_dir=tmp_path)
    assert len(read_calls(tmp_path)) == 2


# ---- redaction runs before the model ------------------------------------------

def test_secrets_are_redacted_before_the_model_call(monkeypatch, tmp_path):
    _, stub, _ = run_probe(monkeypatch, tmp_path, reply(evidence_quote="The deploy finished."),
                           transcript=SECRET_BRIEF)
    assert len(stub.prompts) == 1
    for secret in SECRETS:
        assert secret not in stub.prompts[0]
    assert "The deploy finished." in stub.prompts[0]
    assert "Deploy the report job." in stub.prompts[0]


def test_redaction_runs_even_when_the_model_call_fails(monkeypatch, tmp_path):
    _, stub, _ = run_probe(monkeypatch, tmp_path, error=TimeoutError("slow"), transcript=SECRET_BRIEF)
    assert len(stub.prompts) == 1
    assert not any(secret in stub.prompts[0] for secret in SECRETS)


def test_quote_check_uses_the_redacted_text(monkeypatch, tmp_path):
    for secret in SECRETS:
        _, _, result = run_probe(monkeypatch, tmp_path, reply(evidence_quote=secret), transcript=SECRET_BRIEF)
        assert result.abstain_reason == "quote_not_in_brief"
        assert result.quote_in_text is False


def test_no_secret_reaches_the_call_log(monkeypatch, tmp_path):
    run_probe(monkeypatch, tmp_path, reply(evidence_quote="The deploy finished."), transcript=SECRET_BRIEF)
    stored = (tmp_path / "calls.jsonl").read_text()
    assert not any(secret in stored for secret in SECRETS)


# ---- the command line ---------------------------------------------------------

def printed(capsys) -> dict[str, str]:
    pairs = (line.split(":", 1) for line in capsys.readouterr().out.splitlines() if ":" in line)
    return {k.strip(): v.strip() for k, v in pairs}


def test_main_prints_the_facts_kind_quote_and_quote_check(monkeypatch, tmp_path, capsys):
    probe = probe_with(monkeypatch, StubModel(text=reply()))
    assert probe.main([str(QUESTION_BRIEF), "--log-dir", str(tmp_path)]) == 0
    lines = printed(capsys)
    assert lines["status"] == "waiting_answer"
    assert lines["needs_human"].lower() == "true"
    assert (lines["answer_class"], lines["risk"], lines["priority_hint"]) == ("decide", "low", "soon")
    assert lines["kind"] == "reply"
    assert lines["quote"] == QUESTION
    assert lines["quote_in_text"].lower() == "true"


def test_main_reports_a_quote_that_is_not_in_the_text(monkeypatch, tmp_path, capsys):
    probe = probe_with(monkeypatch, StubModel(text=reply(evidence_quote="Use UTC, as agreed")))
    probe.main([str(QUESTION_BRIEF), "--log-dir", str(tmp_path)])
    assert printed(capsys)["quote_in_text"].lower() == "false"


def test_main_ends_with_exit_zero_after_a_failed_call(monkeypatch, tmp_path, capsys):
    probe = probe_with(monkeypatch, StubModel(error=RateLimited("429 Too Many Requests")))
    assert probe.main([str(QUESTION_BRIEF), "--log-dir", str(tmp_path)]) == 0
    assert printed(capsys)["quote_in_text"].lower() == "false"


def test_main_output_holds_no_secret(monkeypatch, tmp_path, capsys):
    probe = probe_with(monkeypatch, StubModel(text=reply(evidence_quote="The deploy finished.")))
    probe.main([str(SECRET_BRIEF), "--log-dir", str(tmp_path)])
    out = capsys.readouterr().out
    assert not any(secret in out for secret in SECRETS)
