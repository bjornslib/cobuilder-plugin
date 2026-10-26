"""Slice 6, digest a run (RED role).

The contract is in digest_support.py, in schemas.md section 2.3, and in the epic design (slice 6). Every test
uses DummyLM.
1. Module exports and the RunDigest type
2. DigestRun: the valid path and the failure paths
3. The call store
4. previous in the brief
5. Shrink: the largest older inputs and results, one at a time
6. Shrink: what never shrinks, and the Abstains
7. The CLI
"""
from __future__ import annotations

import hashlib
import json
import logging

import pytest
from pydantic import ValidationError

from brief_support import FIXTURES, BUDGET, Transcript, filler, require
from digest_support import (DIGEST, DIGEST_MODEL, FailingLM, ONE_SHRINK, THREE_SHRINKS, RateLimited, build_with,
                            digest_api, digest_reply, dspy, dummy, expect_brief, interpreter_api, log_reasons,
                            make_brief, make_digest, no_live_call, over_budget, read_calls, recent,  # noqa: F401
                            rendered_inputs, run_digest, short_reply, shrunk_entries, simple, stages)
from interpret_support import BLOCKED, QUOTE_1, interpret, script

WAITING = FIXTURES / "waiting-question.jsonl"


# ---- 1. Module exports and the RunDigest type ---------------------------------

def test_digest_module_exports():
    api = digest_api()
    assert issubclass(api.DigestRun, dspy.Module)
    assert callable(api.digest_lm)


def test_the_digest_model_is_the_minimax_model(monkeypatch):
    api = digest_api()
    config = require("priority.config")
    monkeypatch.setattr(config, "load_key", lambda: "sk-or-v1-not-a-real-key")
    assert api.digest_lm().model == DIGEST_MODEL


def test_a_valid_run_digest_holds_its_four_fields():
    value = make_digest()
    assert value.ran == DIGEST["ran"]
    assert value.result == DIGEST["result"]
    assert value.open_items == tuple(DIGEST["open_items"])
    assert value.decisions == tuple(DIGEST["decisions"])


@pytest.mark.parametrize("changes", [
    {"ran": "x" * 601},
    {"result": "x" * 301},
    {"open_items": ["a"] * 6},
    {"decisions": ["a"] * 6},
], ids=["ran over 600", "result over 300", "six open items", "six decisions"])
def test_a_run_digest_over_a_limit_does_not_validate(changes):
    with pytest.raises(ValidationError):
        make_digest(**changes)


def test_a_run_digest_at_each_limit_validates():
    value = make_digest(ran="x" * 600, result="y" * 300, open_items=["a"] * 5, decisions=["b"] * 5)
    assert len(value.ran) == 600 and len(value.open_items) == 5


# ---- 2. DigestRun: the valid path and the failure paths -----------------------

def test_digest_returns_a_valid_run_digest():
    lm = dummy([digest_reply()])
    out = run_digest(lm)
    assert isinstance(out, digest_api().RunDigest)
    assert out == make_digest()
    assert len(lm.history) == 1


def test_digest_keeps_a_digest_with_empty_lists():
    out = run_digest(dummy([digest_reply(open_items=[], decisions=[])]))
    assert isinstance(out, digest_api().RunDigest)
    assert out.open_items == () and out.decisions == ()


def test_the_digest_call_reads_the_brief_text():
    lm = dummy([digest_reply()])
    brief = make_brief()
    run_digest(lm, brief)
    sent = lm.history[0]["messages"][-1]["content"]
    assert brief.for_model() in sent


ERRORS = {
    "rate limit": RateLimited("429 Too Many Requests"),
    "server error": RuntimeError("503 upstream unavailable"),
    "timeout": TimeoutError("the model timed out"),
}


@pytest.mark.parametrize("error", ERRORS.values(), ids=ERRORS.keys())
def test_a_model_failure_gives_an_abstain_and_a_log(caplog, error):
    caplog.set_level(logging.INFO)
    out = run_digest(FailingLM([digest_reply()], error, fail_at=1))
    assert isinstance(out, digest_api().Abstain)
    assert out.reason == "model_error"
    assert str(error) in out.detail or str(error) in log_reasons(caplog)
    assert "model_error" in log_reasons(caplog)
    assert str(error) in log_reasons(caplog)


MALFORMED = {
    "broken JSON": {"digest": "this is not JSON"},
    "a field is missing": {"digest": json.dumps({"ran": "Built it."})},
    "ran over 600": digest_reply(ran="x" * 601),
    "six decisions": digest_reply(decisions=["a"] * 6),
    "the digest field is missing": {"summary": json.dumps(DIGEST)},
}


@pytest.mark.parametrize("bad", MALFORMED.values(), ids=MALFORMED.keys())
def test_a_bad_reply_gives_an_abstain_and_a_log(caplog, bad):
    caplog.set_level(logging.INFO)
    lm = dummy([bad, digest_reply()])
    out = run_digest(lm)
    assert isinstance(out, digest_api().Abstain)
    assert out.reason == "invalid_output"
    assert "invalid_output" in log_reasons(caplog)
    assert len(lm.history) == 1  # a bad reply never leads to a second call


def test_an_exhausted_script_does_not_raise():
    out = run_digest(dummy([]))
    assert isinstance(out, digest_api().Abstain)


def test_digest_never_reads_the_key_when_given_a_model():
    # The autouse fixture makes load_key raise, so a read would fail this test.
    assert isinstance(run_digest(dummy([digest_reply()])), digest_api().RunDigest)


# ---- 3. The call store --------------------------------------------------------

def test_the_digest_call_is_stored_with_model_id_prompt_hash_raw_reply_and_rendered_input(tmp_path):
    lm = dummy([digest_reply()])
    brief = make_brief()
    run_digest(lm, brief, log_dir=tmp_path)
    calls = read_calls(tmp_path)
    assert [c["stage"] for c in calls] == ["digest"]
    call = calls[0]
    assert call["model_id"] == lm.model
    assert call["prompt_hash"] == hashlib.sha256(call["rendered_input"].encode()).hexdigest()
    assert brief.for_model() in call["rendered_input"]
    assert DIGEST["ran"] in call["raw_reply"] and DIGEST["decisions"][0] in call["raw_reply"]


def test_a_failed_digest_call_is_stored_with_its_error(tmp_path):
    lm = FailingLM([digest_reply()], RateLimited("429 Too Many Requests"), fail_at=1)
    out = run_digest(lm, log_dir=tmp_path)
    assert out.reason == "model_error"
    calls = read_calls(tmp_path)
    assert [c["stage"] for c in calls] == ["digest"]
    assert "429" in calls[0]["error"]
    assert calls[0]["model_id"] == lm.model
    assert calls[0]["prompt_hash"] == hashlib.sha256(calls[0]["rendered_input"].encode()).hexdigest()


def test_a_bad_reply_is_stored_as_the_model_sent_it(tmp_path):
    run_digest(dummy([{"digest": "this is not JSON"}]), log_dir=tmp_path)
    calls = read_calls(tmp_path)
    assert [c["stage"] for c in calls] == ["digest"]
    assert "this is not JSON" in calls[0]["raw_reply"]


def test_no_call_file_is_written_without_a_log_dir(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    run_digest(dummy([digest_reply()]))
    assert list(tmp_path.iterdir()) == []


# ---- 4. previous in the brief -------------------------------------------------

def test_a_brief_without_previous_has_none():
    brief = expect_brief(build_with(WAITING))
    assert hasattr(brief, "previous")
    assert brief.previous is None
    assert DIGEST["ran"] not in brief.for_model()


def test_a_brief_carries_previous_and_shows_each_field_to_the_model():
    previous = make_digest()
    brief = expect_brief(build_with(WAITING, previous=previous))
    assert brief.previous == previous
    text = brief.for_model()
    for shown in (DIGEST["ran"], DIGEST["result"], *DIGEST["open_items"], *DIGEST["decisions"]):
        assert shown in text


def test_previous_adds_to_the_plain_brief_and_changes_none_of_it():
    plain = expect_brief(build_with(WAITING)).for_model()
    carried = expect_brief(build_with(WAITING, previous=make_digest())).for_model()
    assert len(carried) > len(plain)
    assert all(line in carried for line in plain.splitlines())


def test_previous_is_the_third_parameter_of_build_brief():
    brief = expect_brief(require("priority.brief").build_brief(WAITING, 1, make_digest()))
    assert brief.previous == make_digest()


def test_the_interpreter_reads_previous_in_its_calls(tmp_path):
    brief = expect_brief(build_with(WAITING, previous=make_digest()))
    interpret(dummy(script(BLOCKED, [("reply", QUOTE_1)])), brief, log_dir=tmp_path)
    inputs = [c["rendered_input"] for c in read_calls(tmp_path)]
    assert inputs and all(DIGEST["ran"] in text for text in inputs)


def test_the_digest_call_reads_previous(tmp_path):
    brief = expect_brief(build_with(WAITING, previous=make_digest()))
    run_digest(dummy([digest_reply()]), brief, log_dir=tmp_path)
    assert DIGEST["result"] in rendered_inputs(tmp_path, "digest")[0]


# ---- 5. Shrink: the largest older inputs and results, one at a time ------------

def test_a_brief_within_the_budget_makes_no_shrink_call(tmp_path):
    lm = dummy([short_reply("never used")])
    brief = expect_brief(build_with(WAITING, shrink_lm=lm, log_dir=tmp_path))
    assert lm.history == []
    assert shrunk_entries(brief) == []
    assert not (tmp_path / "calls.jsonl").exists()


def test_an_over_budget_brief_without_a_shrink_model_is_still_an_abstain(tmp_path):
    res = build_with(over_budget(tmp_path, ONE_SHRINK))
    assert isinstance(res, require("priority.brief").Abstain)
    assert res.reason == "brief_too_large"


def test_the_largest_older_result_shrinks_and_the_brief_fits(tmp_path):
    lm = dummy([short_reply("tiny"), short_reply("never used")])
    path = over_budget(tmp_path, ONE_SHRINK)
    brief = expect_brief(build_with(path, shrink_lm=lm, log_dir=tmp_path / "log"))
    assert len(lm.history) == 1  # it stops at the first size that fits
    assert len(brief.for_model()) <= BUDGET
    assert shrunk_entries(brief) == [(1, "result", 38_000, len("tiny"))]
    assert brief.items[1].result == "tiny"
    assert "zq1 lorem" not in brief.for_model()


def test_the_items_that_did_not_shrink_stay_whole(tmp_path):
    lm = dummy([short_reply("tiny")])
    brief = expect_brief(build_with(over_budget(tmp_path, ONE_SHRINK), shrink_lm=lm))
    for index, size in enumerate(ONE_SHRINK):
        if index != 1:
            assert len(brief.items[index].result) == size
            assert f"zq{index} lorem" in brief.items[index].result
        assert brief.items[index].tool == f"OldTool{index}"


def test_the_shrink_call_reads_the_text_of_the_item(tmp_path):
    lm = dummy([short_reply("tiny")])
    build_with(over_budget(tmp_path, ONE_SHRINK), shrink_lm=lm, log_dir=tmp_path / "log")
    sent = rendered_inputs(tmp_path / "log", "shrink")
    assert len(sent) == 1
    assert "zq1 lorem" in sent[0]
    assert "zq0 lorem" not in sent[0] and "zq3 lorem" not in sent[0]


def test_the_shrink_call_is_stored_with_model_id_prompt_hash_raw_reply_and_rendered_input(tmp_path):
    lm = dummy([short_reply("a short text")])
    build_with(over_budget(tmp_path, ONE_SHRINK), shrink_lm=lm, log_dir=tmp_path / "log")
    calls = read_calls(tmp_path / "log")
    assert [c["stage"] for c in calls] == ["shrink"]
    call = calls[0]
    assert call["model_id"] == lm.model
    assert call["prompt_hash"] == hashlib.sha256(call["rendered_input"].encode()).hexdigest()
    assert "a short text" in call["raw_reply"]
    assert call["rendered_input"]


def test_each_shrink_takes_the_largest_item_that_is_left_and_stops_when_the_brief_fits(tmp_path):
    lm = dummy([short_reply(f"short-{n}") for n in (1, 2, 3, 4, 5, 6)])
    path = over_budget(tmp_path, THREE_SHRINKS)
    brief = expect_brief(build_with(path, shrink_lm=lm, log_dir=tmp_path / "log"))
    assert len(lm.history) == 3
    assert shrunk_entries(brief) == [
        (1, "result", 45_000, len("short-1")),
        (3, "result", 44_000, len("short-2")),
        (5, "result", 43_000, len("short-3")),
    ]
    assert len(brief.for_model()) <= BUDGET
    sent = rendered_inputs(tmp_path / "log", "shrink")
    for text, tag in zip(sent, ("zq1", "zq3", "zq5")):
        assert f"{tag} lorem" in text
    assert stages(tmp_path / "log") == ["shrink"] * 3


def test_the_brief_after_the_shrinks_holds_each_short_text_and_the_older_items_that_stayed(tmp_path):
    lm = dummy([short_reply(f"short-{n}") for n in (1, 2, 3)])
    brief = expect_brief(build_with(over_budget(tmp_path, THREE_SHRINKS), shrink_lm=lm))
    text = brief.for_model()
    for n in (1, 2, 3):
        assert f"short-{n}" in text
    for index in (0, 2, 4):  # the older items that did not shrink
        assert f"zq{index} lorem" in text
        assert len(brief.items[index].result) == THREE_SHRINKS[index]


def test_a_large_input_shrinks_before_smaller_results(tmp_path):
    big = filler(70_000, "zqin")
    t = Transcript()
    t.human("Check the logs.")
    t.exchange("Write", {"cmd": big}, filler(32_000, "zqa"))
    for i in (1, 2, 3):
        t.exchange(f"OldTool{i}", {"idx": i}, filler(32_000, f"zq{i}"))
    for item in recent():
        t.exchange(item[0], item[1], item[2])
    t.reply("Done.")
    path = t.write(tmp_path / "input.jsonl")
    lm = dummy([short_reply("tiny input"), short_reply("never used")])
    brief = expect_brief(build_with(path, shrink_lm=lm))
    assert len(lm.history) == 1
    assert shrunk_entries(brief) == [(0, "input", len(json.dumps({"cmd": big})), len("tiny input"))]
    assert brief.items[0].input == "tiny input"
    assert len(brief.items[0].result) == 32_000
    assert len(brief.for_model()) <= BUDGET


# ---- 6. Shrink: what never shrinks, and the Abstains ---------------------------

def never_shrink_transcript(tmp_path):
    ask, final = filler(6_000, "zqask"), filler(8_000, "zqfinal")
    t = Transcript()
    t.human(ask)
    for item in (*[(f"OldTool{i}", {"idx": i}, filler(n, f"zq{i}")) for i, n in
                  enumerate([30_000, 34_000, 31_000, 33_000, 32_000])],
                 *[(f"NewTool{i}", {"idx": i}, filler(40_000, f"nw{i}")) for i in range(3)]):
        t.exchange(*item)
    t.reply(final)
    t.synthetic("CLIENT-SENTINEL the client stopped with an error")
    t.human("HUMAN-SENTINEL a later human line")
    return ask, final, t.write(tmp_path / "never.jsonl")


def test_the_parts_that_never_shrink_stay_whole(tmp_path):
    ask, final, path = never_shrink_transcript(tmp_path)
    lm = dummy([short_reply(f"s{n}") for n in range(20)])
    brief = expect_brief(build_with(path, shrink_lm=lm))
    assert len(brief.shrunk) >= 1
    assert len(brief.for_model()) <= BUDGET
    assert brief.ask.text == ask
    assert brief.final == final
    for index in (5, 6, 7):  # the last three tool items
        assert len(brief.items[index].result) == 40_000
        assert f"nw{index - 5} lorem" in brief.items[index].result
        assert brief.items[index].input == json.dumps({"idx": index - 5})
    text = brief.for_model()
    assert "CLIENT MESSAGE:" in text and "CLIENT-SENTINEL the client stopped with an error" in text
    assert "[human] HUMAN-SENTINEL a later human line" in text
    assert brief.client_messages == ("CLIENT-SENTINEL the client stopped with an error",)


def test_only_older_items_shrink(tmp_path):
    _, _, path = never_shrink_transcript(tmp_path)
    lm = dummy([short_reply(f"s{n}") for n in range(20)])
    brief = expect_brief(build_with(path, shrink_lm=lm))
    entries = shrunk_entries(brief)
    assert entries and all(item < 5 for item, *_ in entries)
    assert all(part in ("input", "result") for _, part, *_ in entries)
    assert all(after < before for _, _, before, after in entries)


def test_each_shrink_is_one_call_and_each_call_is_in_the_brief_record(tmp_path):
    _, _, path = never_shrink_transcript(tmp_path)
    lm = dummy([short_reply(f"s{n}") for n in range(20)])
    brief = expect_brief(build_with(path, shrink_lm=lm, log_dir=tmp_path / "log"))
    assert len(brief.shrunk) == len(lm.history) == len(stages(tmp_path / "log"))
    assert set(stages(tmp_path / "log")) == {"shrink"}


def test_a_brief_that_stays_over_the_budget_after_every_shrink_is_an_abstain(tmp_path):
    path = over_budget(tmp_path, [35_000, 34_000, 33_000, 32_000, 31_000], recent_size=50_000)
    lm = dummy([short_reply(filler(12_000, f"long{n}")) for n in range(20)])
    res = build_with(path, shrink_lm=lm, log_dir=tmp_path / "log")
    assert isinstance(res, require("priority.brief").Abstain)
    assert res.reason == "brief_too_large"
    assert res.final is False  # the parts that never shrink fit alone
    assert 5 <= len(lm.history) <= 10  # every older result, and at most every older input
    assert set(stages(tmp_path / "log")) == {"shrink"}


@pytest.mark.parametrize("error", ERRORS.values(), ids=ERRORS.keys())
@pytest.mark.parametrize("fail_at", [1, 2])
def test_a_shrink_failure_gives_an_abstain_and_a_log(tmp_path, caplog, error, fail_at):
    caplog.set_level(logging.INFO)
    lm = FailingLM([short_reply(f"short-{n}") for n in range(6)], error, fail_at=fail_at)
    res = build_with(over_budget(tmp_path, THREE_SHRINKS), shrink_lm=lm, log_dir=tmp_path / "log")
    assert isinstance(res, require("priority.brief").Abstain)
    assert res.reason == "model_error"
    assert "model_error" in log_reasons(caplog)
    assert str(error) in res.detail or str(error) in log_reasons(caplog)
    calls = read_calls(tmp_path / "log")
    assert len(calls) == fail_at and "error" in calls[-1]


def test_a_bad_shrink_reply_gives_an_abstain_and_a_log(tmp_path, caplog):
    caplog.set_level(logging.INFO)
    lm = dummy([{"summary": "tiny"}, short_reply("tiny")])
    res = build_with(over_budget(tmp_path, ONE_SHRINK), shrink_lm=lm)
    assert isinstance(res, require("priority.brief").Abstain)
    assert res.reason == "invalid_output"
    assert "invalid_output" in log_reasons(caplog)
    assert len(lm.history) == 1


# ---- 7. The CLI ---------------------------------------------------------------

def run_cli(monkeypatch, capsys, lm, transcript, *args):
    api = digest_api()
    cli = require("priority.cli")
    monkeypatch.setattr(api, "digest_lm", lambda *a, **k: lm)
    monkeypatch.setattr(cli, "digest_lm", lambda *a, **k: lm, raising=False)
    try:
        code = cli.main(["digest", str(transcript), *args])
    except SystemExit as exc:
        code = exc.code
    return code, capsys.readouterr().out


def test_the_cli_prints_a_run_digest_that_validates(monkeypatch, capsys):
    code, out = run_cli(monkeypatch, capsys, dummy([digest_reply()]), WAITING)
    assert code == 0
    data = json.loads(out)
    assert digest_api().RunDigest.model_validate(data) == make_digest()
    assert set(data) == {"ran", "result", "open_items", "decisions"}


def test_the_cli_stores_the_digest_call_in_the_log_dir(monkeypatch, capsys, tmp_path):
    code, _ = run_cli(monkeypatch, capsys, dummy([digest_reply()]), WAITING, "--log-dir", str(tmp_path))
    assert code == 0
    assert stages(tmp_path) == ["digest"]


def test_the_cli_digests_the_stop_that_the_option_names(monkeypatch, capsys, tmp_path):
    t = Transcript()
    t.human("Do the first thing.")
    t.reply("FIRSTREPLY the first thing is done.")
    t.human("Now do the second thing.")
    t.reply("SECONDREPLY the second thing is done.")
    path = t.write(tmp_path / "two.jsonl")
    code, _ = run_cli(monkeypatch, capsys, dummy([digest_reply()]), path, "--stop", "1", "--log-dir",
                      str(tmp_path / "log"))
    assert code == 0
    sent = rendered_inputs(tmp_path / "log", "digest")[0]
    assert "FIRSTREPLY" in sent and "SECONDREPLY" not in sent


def test_the_cli_prints_an_abstain_for_a_model_failure(monkeypatch, capsys):
    lm = FailingLM([digest_reply()], RateLimited("429 Too Many Requests"), fail_at=1)
    code, out = run_cli(monkeypatch, capsys, lm, WAITING)
    assert code == 0
    assert json.loads(out)["reason"] == "model_error"


def test_the_cli_prints_an_abstain_for_a_bad_reply(monkeypatch, capsys):
    code, out = run_cli(monkeypatch, capsys, dummy([{"digest": "this is not JSON"}]), WAITING)
    assert code == 0
    assert json.loads(out)["reason"] == "invalid_output"


def test_the_cli_prints_the_brief_abstain_and_never_calls_the_model(monkeypatch, capsys):
    lm = dummy([digest_reply()])
    code, out = run_cli(monkeypatch, capsys, lm, FIXTURES / "brief-only-synthetic.jsonl")
    assert code == 0
    assert json.loads(out)["reason"] == "no_agent_reply"
    assert lm.history == []


def test_the_cli_shrinks_an_over_budget_brief_with_the_digest_model_and_then_digests(monkeypatch, capsys, tmp_path):
    path = over_budget(tmp_path, ONE_SHRINK)
    lm = dummy([short_reply("tiny"), digest_reply()])
    code, out = run_cli(monkeypatch, capsys, lm, path, "--log-dir", str(tmp_path / "log"))
    assert code == 0
    assert json.loads(out)["ran"] == DIGEST["ran"]
    assert stages(tmp_path / "log") == ["shrink", "digest"]
    assert "tiny" in rendered_inputs(tmp_path / "log", "digest")[0]
    assert "zq1 lorem" not in rendered_inputs(tmp_path / "log", "digest")[0]


def test_the_cli_prints_brief_too_large_when_the_shrinks_do_not_fit_and_never_digests(monkeypatch, capsys, tmp_path):
    path = over_budget(tmp_path, [35_000, 34_000, 33_000, 32_000, 31_000], recent_size=50_000)
    lm = dummy([short_reply(filler(12_000, f"long{n}")) for n in range(20)])
    code, out = run_cli(monkeypatch, capsys, lm, path, "--log-dir", str(tmp_path / "log"))
    assert code == 0
    assert json.loads(out)["reason"] == "brief_too_large"
    assert "digest" not in stages(tmp_path / "log")


def test_the_cli_prints_an_abstain_when_a_shrink_call_fails(monkeypatch, capsys, tmp_path):
    lm = FailingLM([short_reply("tiny")], RateLimited("429 Too Many Requests"), fail_at=1)
    code, out = run_cli(monkeypatch, capsys, lm, over_budget(tmp_path, ONE_SHRINK))
    assert code == 0
    assert json.loads(out)["reason"] == "model_error"
