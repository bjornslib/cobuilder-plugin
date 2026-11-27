"""Slice 21 RED: `priority interpret` prints the Prediction fields as JSON.

The command builds the brief, runs the one-call Interpreter with the session
id set to the transcript stem, and prints `status`, `needs_human`,
`priority`, `steps`, and `abstain`. It exits 0 for a Prediction and for an
Abstain. A brief that is an Abstain never reaches the model.
"""
from __future__ import annotations

import json

from brief_support import FIXTURES, require
from interpret_support import (DONE, FailingLM, RateLimited, dummy, interpreter_api, no_live_call,  # noqa: F401
                               propose, read_calls, step)


def run_cli(monkeypatch, capsys, lm, transcript, *args):
    api = interpreter_api()
    cli = require("priority.cli")
    monkeypatch.setattr(api, "interpreter_lm", lambda *a, **k: lm)
    monkeypatch.setattr(cli, "interpreter_lm", lambda *a, **k: lm, raising=False)
    try:
        code = cli.main(["interpret", str(transcript), *args])
    except SystemExit as exc:
        code = exc.code
    return code, json.loads(capsys.readouterr().out)


def test_the_cli_prints_the_prediction_fields(monkeypatch, capsys):
    lm = dummy([propose([step("reply"), step("pick_option")], priority="P1")])
    code, data = run_cli(monkeypatch, capsys, lm, FIXTURES / "waiting-question.jsonl")
    assert code == 0
    assert {"status", "needs_human", "priority", "steps", "abstain"} <= set(data), f"the CLI printed {sorted(data)}"
    assert data["abstain"] is None
    assert (data["status"], data["needs_human"], data["priority"]) == ("waiting_answer", True, "P1")
    assert [item["kind"] for item in data["steps"]] == ["reply", "pick_option"]
    assert all(item["session_id"] == "waiting-question" for item in data["steps"])


def test_the_cli_prints_an_invalid_output_abstain(monkeypatch, capsys):
    code, data = run_cli(monkeypatch, capsys, dummy([propose([{"kind": "launch_missile"}])]),
                         FIXTURES / "waiting-question.jsonl")
    assert code == 0
    assert (data.get("abstain") or {}).get("reason") == "invalid_output", f"the CLI printed {data}"
    assert "launch_missile" in data["abstain"]["raw"]


def test_the_cli_prints_a_model_error_abstain(monkeypatch, capsys):
    lm = FailingLM([DONE], RateLimited("429 Too Many Requests"), fail_at=1)
    code, data = run_cli(monkeypatch, capsys, lm, FIXTURES / "waiting-question.jsonl")
    assert code == 0
    assert (data.get("abstain") or {}).get("reason") == "model_error", f"the CLI printed {data}"


def test_the_cli_stores_one_call_row_in_the_log_dir(monkeypatch, capsys, tmp_path):
    code, _ = run_cli(monkeypatch, capsys, dummy([DONE]), FIXTURES / "waiting-question.jsonl",
                      "--log-dir", str(tmp_path))
    assert code == 0
    assert len(read_calls(tmp_path)) == 1


def test_the_cli_prints_the_brief_abstain_and_never_calls_the_model(monkeypatch, capsys):
    lm = dummy([DONE])
    code, data = run_cli(monkeypatch, capsys, lm, FIXTURES / "brief-only-synthetic.jsonl")
    assert code == 0
    assert (data.get("abstain") or {}).get("reason") == "no_agent_reply", f"the CLI printed {data}"
    assert lm.history == []
