"""Slice 4, the stop brief builder tests (RED role).

Pins the contract from brief_support.py and epic-E2-design.md:
1. Module imports and types (build_brief, StopBrief, Abstain, BUDGET_CHARS)
2. Items in order, no line limit, no clipping
3. Client messages and only-synthetic transcripts
4. After stop: human lines after last agent message
5. Redaction of planted secrets
6. Nothing clipped below 160k budget
7. Size budget and Abstain brief_too_large
8. CLI and snapshots
"""
from __future__ import annotations

import inspect
from pathlib import Path

import pytest

from brief_support import (BUDGET, FIXTURES, PLANTED, SNAPSHOTS, Transcript,
                           brief_api, build, filler, require, simple)


# ---- 1. Module imports and types --------------------------------------------

def test_brief_module_exports():
    mod = brief_api()
    assert hasattr(mod, "build_brief")
    assert hasattr(mod, "StopBrief")
    assert hasattr(mod, "Abstain")
    assert hasattr(mod, "BUDGET_CHARS")
    assert mod.BUDGET_CHARS == 160_000


def test_build_brief_signature():
    mod = brief_api()
    sig = inspect.signature(mod.build_brief)
    params = list(sig.parameters.values())
    assert [p.name for p in params] == ["transcript", "stop", "previous", "shrink_lm", "log_dir"]
    assert params[1].default is None
    assert params[2].default is None


def test_stop_brief_fields():
    mod = brief_api()
    brief = build(FIXTURES / "brief-plain.jsonl")
    assert isinstance(brief, mod.StopBrief)
    assert hasattr(brief.ask, "text")
    assert hasattr(brief, "items")
    assert hasattr(brief, "final")
    assert hasattr(brief, "stop_source")
    assert hasattr(brief, "client_messages")
    assert hasattr(brief, "after_stop")
    assert callable(getattr(brief, "for_model", None))


def test_abstain_fields():
    mod = brief_api()
    abstain = build(FIXTURES / "brief-only-synthetic.jsonl")
    assert isinstance(abstain, mod.Abstain)
    assert hasattr(abstain, "reason")
    assert hasattr(abstain, "detail")
    assert hasattr(abstain, "final")
    assert isinstance(abstain.final, bool)


# ---- 2. Items in order, no line limit, no clipping ---------------------------

def test_plain_run_items_and_fields():
    brief = build(FIXTURES / "brief-plain.jsonl")
    assert brief.ask.text == "Add input validation to the signup form."
    assert brief.final == "I added the check to the signup form. All tests pass."
    assert brief.stop_source == "agent"
    assert len(brief.items) == 3

    item0 = brief.items[0]
    assert item0.type == "text"
    assert item0.text == "I will read the form first."

    item1 = brief.items[1]
    assert item1.type == "tool"
    assert item1.tool == "Read"
    assert "signup.py" in item1.input
    assert item1.result == "def signup(form): ..."
    assert item1.is_error is False

    item2 = brief.items[2]
    assert item2.type == "tool"
    assert item2.tool == "Edit"
    assert "new_string" in item2.input
    assert item2.result == "File updated."
    assert item2.is_error is False


def test_tool_result_paired_by_id_and_error_flag():
    brief = build(FIXTURES / "brief-tool-error.jsonl")
    assert brief.ask.text == "Run the form tests and tell me what fails."
    assert len(brief.items) == 1
    tool_item = brief.items[0]
    assert tool_item.type == "tool"
    assert tool_item.tool == "Bash"
    assert "pytest tests/test_form.py -q" in tool_item.input
    assert tool_item.is_error is True
    assert "Exit code 1" in tool_item.result
    assert brief.final == "One test fails: test_empty_name. Should I fix the form or the test?"


def test_duplicate_message_id_counted_once():
    brief = build(FIXTURES / "brief-duplicate-id.jsonl")
    assert brief.ask.text == "Rename the helper module."
    assert len(brief.items) == 1
    assert brief.items[0].tool == "Bash"
    assert brief.final == "The helper module is now tools.py."


def test_bare_continue_inside_run_is_human_item():
    brief = build(FIXTURES / "brief-bare-continue.jsonl")
    assert brief.ask.text == "Add a retry to the upload helper."
    assert len(brief.items) == 4

    assert brief.items[0].type == "tool"
    assert brief.items[0].tool == "Read"

    assert brief.items[1].type == "text"
    assert "I read the helper." in brief.items[1].text

    assert brief.items[2].type == "human"
    assert brief.items[2].text.strip().lower() == "continue"

    assert brief.items[3].type == "tool"
    assert brief.items[3].tool == "Edit"

    assert brief.final == "I added the retry to the upload helper. The tests pass."


def test_stop_indexing():
    # Stop 1 is before the bare continue
    brief1 = build(FIXTURES / "brief-bare-continue.jsonl", stop=1)
    assert brief1.ask.text == "Add a retry to the upload helper."
    assert len(brief1.items) == 1
    assert brief1.items[0].tool == "Read"
    assert brief1.final == "I read the helper. It has no retry. I stopped before I changed it."

    # Stop 2 is the last stop
    brief2 = build(FIXTURES / "brief-bare-continue.jsonl", stop=2)
    brief_last = build(FIXTURES / "brief-bare-continue.jsonl", stop=None)
    assert brief2.final == brief_last.final
    assert len(brief2.items) == len(brief_last.items)


# ---- 3. Client messages -----------------------------------------------------

def test_client_message_sets_client_error():
    brief = build(FIXTURES / "brief-client-error.jsonl")
    assert brief.stop_source == "client_error"
    assert brief.client_messages == ("You have reached the usage limit. It resets at 3pm.",)
    assert brief.final == "I moved two of the three loaders. I will do the last one next."
    assert len(brief.after_stop) == 1
    assert brief.after_stop[0].source == "client"
    assert brief.after_stop[0].text == "You have reached the usage limit. It resets at 3pm."

    model_text = brief.for_model()
    assert "You have reached the usage limit. It resets at 3pm." in model_text
    assert "CLIENT MESSAGE:" in model_text


def test_only_synthetic_transcript_returns_abstain():
    mod = brief_api()
    res = build(FIXTURES / "brief-only-synthetic.jsonl")
    assert isinstance(res, mod.Abstain)
    assert res.reason == "no_agent_reply"


# ---- 4. After stop ----------------------------------------------------------

def test_human_lines_after_stop_for_last_stop(tmp_path):
    path = simple(
        tmp_path / "after.jsonl",
        ask="Deploy service.",
        final="Deploy failed.",
        after=[("client", "Rate limit hit."), ("human", "continue")],
    )
    brief = build(path)
    assert brief.stop_source == "client_error"
    assert len(brief.after_stop) == 2
    assert brief.after_stop[0].source == "client"
    assert brief.after_stop[0].text == "Rate limit hit."
    assert brief.after_stop[1].source == "human"
    assert brief.after_stop[1].text == "continue"

    model_text = brief.for_model()
    assert "Rate limit hit." in model_text
    assert "continue" in model_text


def test_human_line_after_earlier_stop_omitted_from_after_stop():
    brief1 = build(FIXTURES / "brief-bare-continue.jsonl", stop=1)
    # The continue following stop 1 answered that stop, so after_stop for stop 1 has no human line
    human_lines = [line for line in brief1.after_stop if getattr(line, "source", None) == "human"]
    assert len(human_lines) == 0


# ---- 5. Redaction of planted secrets -----------------------------------------

def test_redaction_of_all_planted_secrets(tmp_path):
    path = tmp_path / "secret.jsonl"
    t = Transcript()
    t.human(f"Ask with secret: {PLANTED['ask']}")
    t.assistant({"type": "text", "text": f"Agent text: {PLANTED['agent_text']}"})
    t.exchange("Bash", {"command": f"echo {PLANTED['tool_input']}"}, f"output {PLANTED['tool_result']}")
    t.reply(f"Final reply: {PLANTED['final']}")
    t.synthetic(f"Client error: {PLANTED['client']}")
    t.human(f"After human: {PLANTED['after_human']}")
    t.write(path)

    brief = build(path)
    model_text = brief.for_model()

    for name, secret in PLANTED.items():
        assert secret not in brief.ask.text, f"secret {name} leaked into ask.text"
        assert secret not in brief.final, f"secret {name} leaked into final"
        for item in brief.items:
            if getattr(item, "text", None):
                assert secret not in item.text, f"secret {name} leaked into item.text"
            if getattr(item, "input", None):
                assert secret not in item.input, f"secret {name} leaked into item.input"
            if getattr(item, "result", None):
                assert secret not in item.result, f"secret {name} leaked into item.result"
        for msg in brief.client_messages:
            assert secret not in msg, f"secret {name} leaked into client_messages"
        for line in brief.after_stop:
            assert secret not in getattr(line, "text", ""), f"secret {name} leaked into after_stop"
        assert secret not in model_text, f"secret {name} leaked into for_model()"


# ---- 6. Nothing clipped below 160k budget ------------------------------------

def test_nothing_clipped_large_reply(tmp_path):
    large_reply = filler(5_000, "reply")
    path = simple(tmp_path / "large_reply.jsonl", final=large_reply)
    brief = build(path)
    assert len(brief.final) == 5_000
    assert brief.final in brief.for_model()


def test_nothing_clipped_large_tool_input_and_result(tmp_path):
    large_input = filler(2_600, "in")
    large_result = filler(50_000, "out")
    path = simple(
        tmp_path / "large_tool.jsonl",
        exchanges=[("Bash", {"cmd": large_input}, large_result)],
    )
    brief = build(path)
    tool_item = brief.items[0]
    assert len(tool_item.result) == 50_000
    assert large_input in tool_item.input
    assert tool_item.result in brief.for_model()
    assert large_input in brief.for_model()


def test_nothing_clipped_150_exchanges(tmp_path):
    exchanges = [(f"Tool{i}", {"idx": i}, f"result_{i}") for i in range(150)]
    path = simple(tmp_path / "many_exchanges.jsonl", exchanges=exchanges)
    brief = build(path)
    assert len(brief.items) == 150
    model_text = brief.for_model()
    assert "Tool0" in model_text
    assert "Tool75" in model_text
    assert "Tool149" in model_text


# ---- 7. Budget --------------------------------------------------------------

def test_budget_exceeded_returns_abstain_brief_too_large(tmp_path):
    mod = brief_api()
    # 5 older exchanges of 35,000 chars result each (~175,000 chars total)
    # followed by 3 recent exchanges of 100 chars
    older = [(f"OldTool{i}", {"idx": i}, filler(35_000, f"old{i}")) for i in range(5)]
    recent = [(f"RecentTool{i}", {"idx": i}, filler(100, f"rec{i}")) for i in range(3)]
    path = simple(tmp_path / "over_budget.jsonl", exchanges=[*older, *recent])

    res = build(path)
    assert isinstance(res, mod.Abstain)
    assert res.reason == "brief_too_large"
    assert res.final is False
    # detail lists older tool inputs and results by size, largest first
    assert "old" in res.detail


def test_budget_exceeded_protected_parts_alone_sets_final_true(tmp_path):
    mod = brief_api()
    # Final reply alone exceeds BUDGET (160,000 chars)
    giant_final = filler(165_000, "giant")
    path = simple(tmp_path / "protected_overflow.jsonl", final=giant_final)

    res = build(path)
    assert isinstance(res, mod.Abstain)
    assert res.reason == "brief_too_large"
    assert res.final is True


# ---- 8. CLI and snapshots ---------------------------------------------------

@pytest.mark.parametrize("name", [
    "brief-plain",
    "brief-bare-continue",
    "brief-client-error",
    "brief-duplicate-id",
    "brief-tool-error",
])
def test_cli_brief_snapshot(name, capsys):
    cli = require("priority.cli")
    fixture_path = FIXTURES / f"{name}.jsonl"
    snapshot_path = SNAPSHOTS / f"{name}.txt"
    assert snapshot_path.is_file(), f"snapshot missing: {snapshot_path}"

    rc = cli.main(["brief", str(fixture_path)])
    assert rc == 0
    captured = capsys.readouterr().out
    assert captured.strip() == snapshot_path.read_text().strip()


def test_cli_brief_abstain(capsys):
    cli = require("priority.cli")
    fixture_path = FIXTURES / "brief-only-synthetic.jsonl"
    rc = cli.main(["brief", str(fixture_path)])
    assert rc == 0
    captured = capsys.readouterr().out
    assert "no_agent_reply" in captured
